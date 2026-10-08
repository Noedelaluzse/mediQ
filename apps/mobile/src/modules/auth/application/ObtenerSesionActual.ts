import type { Conectividad } from '@/shared/kernel/Conectividad';

import type { AuthRepository } from '../domain/AuthRepository';
import { SinConexionError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

/** `sinVerificar`: se entró con la sesión guardada en el teléfono porque no hubo forma de comprobarla con Google y Firebase (sin internet). */
export type Restauracion = { sesion: Sesion | null; sinVerificar: boolean };

/**
 * Al abrir la app: si hay sesión guardada, vuelve a autenticar en silencio para que el backend
 * (Firebase Auth) también reconozca al usuario; sin eso las lecturas de datos serían rechazadas.
 *
 * Sin internet (F052) no se puede hacer esa comprobación, pero eso no significa que la sesión sea inválida: se entra con la sesión
 * guardada, marcada `sinVerificar`, y se verifica cuando vuelva la conexión. Solo se pide iniciar sesión de nuevo cuando Google o
 * Firebase la rechazan de verdad (no hay credencial, o la cuenta no es aceptada).
 */
export class ObtenerSesionActual {
  constructor(
    private readonly sesiones: SesionStore,
    private readonly identidad: ProveedorDeIdentidad,
    private readonly auth: AuthRepository,
    /** La red del teléfono (no la que depende de la sesión: esa dice «sin internet» justo hasta que esta verificación termina). */
    private readonly red: Conectividad,
  ) {}

  async ejecutar(): Promise<Restauracion> {
    const guardada = await this.sesiones.leer();
    if (!guardada) return { sesion: null, sinVerificar: false };

    // Sin internet ni se intenta: Google y Firebase tardarían en rendirse y el resultado sería el mismo.
    if (!(await this.red.estaConectado())) return { sesion: guardada, sinVerificar: true };

    const token = await this.identidad.obtenerIdTokenSilencioso();
    if (!token.ok) return token.error instanceof SinConexionError ? { sesion: guardada, sinVerificar: true } : { sesion: null, sinVerificar: false };

    const renovada = await this.auth.autenticarConGoogle(token.value);
    if (!renovada.ok) return renovada.error instanceof SinConexionError ? { sesion: guardada, sinVerificar: true } : { sesion: null, sinVerificar: false };

    await this.sesiones.guardar(renovada.value);
    return { sesion: renovada.value, sinVerificar: false };
  }
}

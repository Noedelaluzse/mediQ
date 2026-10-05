import type { AuthRepository } from '../domain/AuthRepository';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

/**
 * Al abrir la app: si hay sesión guardada, vuelve a autenticar en silencio para que el backend
 * (Firebase Auth) también reconozca al usuario; sin eso las lecturas de datos serían rechazadas.
 * Devuelve null si no se puede restaurar: el usuario debe iniciar sesión de nuevo.
 */
export class ObtenerSesionActual {
  constructor(
    private readonly sesiones: SesionStore,
    private readonly identidad: ProveedorDeIdentidad,
    private readonly auth: AuthRepository,
  ) {}

  async ejecutar(): Promise<Sesion | null> {
    const guardada = await this.sesiones.leer();
    if (!guardada) return null;

    const token = await this.identidad.obtenerIdTokenSilencioso();
    if (!token.ok) return null;

    const renovada = await this.auth.autenticarConGoogle(token.value);
    if (!renovada.ok) return null;

    await this.sesiones.guardar(renovada.value);
    return renovada.value;
  }
}

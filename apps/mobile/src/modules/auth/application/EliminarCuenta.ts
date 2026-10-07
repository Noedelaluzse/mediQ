import { err, ok, type Result } from '@/shared/kernel/Result';

import type { AuthRepository } from '../domain/AuthRepository';
import type { EliminadorDeDatos } from '../domain/EliminadorDeDatos';
import { ReautenticacionRequeridaError, ServidorNoDisponibleError, SesionNoRestauradaError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { SesionStore } from '../domain/SesionStore';

const sinFallar = async (accion: () => Promise<unknown>): Promise<void> => {
  try {
    await accion();
  } catch {
    // Desvincular Google no debe impedir que la cuenta ya borrada cierre su sesión.
  }
};

/**
 * RF-05: elimina la cuenta con todos sus datos.
 *
 * 1. Reautentica en silencio ANTES de borrar nada: Firebase exige un inicio de sesión reciente para
 *    borrar al usuario, y reautenticar después volvería a crear la cuenta (RegistrarCuenta). El uid sale de esa
 *    reautenticación (F043); si difiere del de la sesión guardada, aborta sin borrar nada.
 * 2. Borra los datos mientras el usuario aún está autenticado (las reglas lo exigen).
 * 3. Borra el usuario de Auth (con lo que sus tokens de refresco dejan de ser válidos).
 * 4. Desvincula Google, cierra su sesión y borra la sesión local.
 * Si algo falla antes del paso 4, la sesión se conserva y se puede reintentar: el borrado es idempotente.
 */
export class EliminarCuenta {
  constructor(
    private readonly sesiones: SesionStore,
    private readonly datos: EliminadorDeDatos,
    private readonly auth: AuthRepository,
    private readonly identidad: ProveedorDeIdentidad,
  ) {}

  async ejecutar(): Promise<Result<void, SesionNoRestauradaError | ServidorNoDisponibleError>> {
    const sesion = await this.sesiones.leer();
    if (!sesion) return err(new SesionNoRestauradaError());

    const token = await this.identidad.obtenerIdTokenSilencioso();
    if (!token.ok) return err(new SesionNoRestauradaError());
    const reciente = await this.auth.autenticarConGoogle(token.value);
    if (!reciente.ok) return err(new ServidorNoDisponibleError());

    // F043: el uid a borrar es el de Firebase (la identidad que ven las reglas), nunca solo el de la sesión guardada en el
    // teléfono. Si no coinciden (otra cuenta de Google, sesión vieja) no se borra nada y se pide iniciar sesión de nuevo.
    const usuarioId = reciente.value.usuario.id;
    if (usuarioId !== sesion.usuario.id) return err(new SesionNoRestauradaError());

    try {
      await this.datos.eliminarTodo(usuarioId);
    } catch (causa) {
      return err(new ServidorNoDisponibleError(causa));
    }

    const borrado = await this.auth.eliminarUsuario();
    if (!borrado.ok) {
      return err(borrado.error instanceof ReautenticacionRequeridaError ? new ServidorNoDisponibleError() : borrado.error);
    }

    await sinFallar(() => this.identidad.revocarAcceso());
    await sinFallar(() => this.identidad.cerrarSesion());
    await this.sesiones.borrar();
    return ok(undefined);
  }
}

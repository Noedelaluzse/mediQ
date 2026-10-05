import type { AuthRepository } from '../domain/AuthRepository';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { SesionStore } from '../domain/SesionStore';

const sinFallar = async (accion: () => Promise<unknown>): Promise<void> => {
  try {
    await accion();
  } catch {
    // Cerrar sesión nunca debe quedarse a medias por un fallo de una pieza.
  }
};

/**
 * RF-04: cierra la sesión de Firebase y de Google en este dispositivo y borra la sesión guardada.
 * No invalida en el servidor el token ya emitido (caduca solo en ~1 hora): revocarlo exigiría una
 * Cloud Function (plan Blaze) o sesiones controladas por las reglas de Firestore (docs/11).
 */
export class CerrarSesion {
  constructor(
    private readonly sesiones: SesionStore,
    private readonly auth: AuthRepository,
    private readonly identidad: ProveedorDeIdentidad,
  ) {}

  async ejecutar(): Promise<void> {
    await sinFallar(() => this.auth.cerrarSesion());
    await sinFallar(() => this.identidad.cerrarSesion());
    await this.sesiones.borrar();
  }
}

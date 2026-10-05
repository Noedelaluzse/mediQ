import { documentosPendientes, VERSIONES_VIGENTES } from '../domain/Consentimiento';
import type { ConsentimientosRepository } from '../domain/ConsentimientosRepository';
import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

/** RF-03: registra qué documentos aceptó el usuario (versión y fecha) y marca la sesión como ya vista. */
export class AceptarAvisoDePrivacidad {
  constructor(
    private readonly sesiones: SesionStore,
    private readonly consentimientos: ConsentimientosRepository,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async ejecutar(): Promise<Sesion | null> {
    const actual = await this.sesiones.leer();
    if (!actual) return null;

    const usuarioId = actual.usuario.id;
    const aceptados = await this.consentimientos.listar(usuarioId);
    for (const documento of documentosPendientes(aceptados)) {
      await this.consentimientos.registrar(usuarioId, {
        documento,
        version: VERSIONES_VIGENTES[documento],
        aceptadoEn: this.ahora(),
      });
    }

    const actualizada: Sesion = { ...actual, primeraVez: false };
    await this.sesiones.guardar(actualizada);
    return actualizada;
  }
}

import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

/** Marca el aviso de primer inicio como visto. El registro formal del consentimiento es RF-03. */
export class AceptarAvisoDePrivacidad {
  constructor(private readonly sesiones: SesionStore) {}

  async ejecutar(): Promise<Sesion | null> {
    const actual = await this.sesiones.leer();
    if (!actual) return null;
    const actualizada: Sesion = { ...actual, primeraVez: false };
    await this.sesiones.guardar(actualizada);
    return actualizada;
  }
}

import type { Biometria, Disponibilidad, PreferenciaDelCandado, PreferenciaDelCandadoStore } from '../domain/Candado';

export type EstadoDelCandado = PreferenciaDelCandado & { disponibilidad: Disponibilidad };

/** F036: lo guardado del candado junto con lo que el teléfono permite. */
export class ObtenerEstadoDelCandado {
  constructor(
    private readonly preferencia: PreferenciaDelCandadoStore,
    private readonly biometria: Biometria,
  ) {}

  async ejecutar(): Promise<EstadoDelCandado> {
    const [guardada, disponibilidad] = await Promise.all([this.preferencia.leer(), this.biometria.disponibilidad()]);
    return { ...guardada, disponibilidad };
  }
}

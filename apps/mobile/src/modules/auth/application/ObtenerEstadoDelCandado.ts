import type { Biometria, Disponibilidad, PreferenciaDelCandado, PreferenciaDelCandadoStore } from '../domain/Candado';

export type EstadoDelCandado = PreferenciaDelCandado & { disponibilidad: Disponibilidad };

/** F036: lo guardado del candado junto con lo que el teléfono permite. */
export class ObtenerEstadoDelCandado {
  constructor(
    private readonly preferencia: PreferenciaDelCandadoStore,
    private readonly biometria: Biometria,
  ) {}

  async ejecutar(): Promise<EstadoDelCandado> {
    // Lo guardado es lo que decide si se bloquea: si no se puede leer, el error sube. Si el teléfono no responde si tiene Face ID solo cuenta
    // como «sin sensor» (afecta la oferta de activarlo, no el bloqueo: desbloquear vuelve a preguntarle y, si falla, ofrece cerrar sesión).
    const [guardada, disponibilidad] = await Promise.all([this.preferencia.leer(), this.biometria.disponibilidad().catch((): Disponibilidad => 'sinSensor')]);
    return { ...guardada, disponibilidad };
  }
}

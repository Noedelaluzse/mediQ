import { esFutura, type ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';

/** RF-16 / HU-09: la cita futura más cercana, o null (y entonces la tarjeta no aparece). */
export class ObtenerProximaCita {
  constructor(
    private readonly citas: ProximaCitaRepository,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(): Promise<ProximaCita | null> {
    const ahora = this.ahora();
    const futuras = (await this.citas.posterioresA(ahora)).filter((c) => esFutura(c, ahora));
    return futuras.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())[0] ?? null;
  }
}

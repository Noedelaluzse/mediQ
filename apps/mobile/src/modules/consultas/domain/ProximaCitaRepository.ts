import type { ProximaCita } from './ProximaCita';

export interface ProximaCitaRepository {
  /** Citas de consultas vigentes posteriores a `ahora`, de la más cercana a la más lejana (unas cuantas). */
  posterioresA(ahora: Date): Promise<ProximaCita[]>;
}

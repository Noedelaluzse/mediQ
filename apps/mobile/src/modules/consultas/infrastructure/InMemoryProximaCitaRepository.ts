import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';

/** Modo simulado: no hay citas. */
export class InMemoryProximaCitaRepository implements ProximaCitaRepository {
  async posterioresA() {
    return [];
  }
}

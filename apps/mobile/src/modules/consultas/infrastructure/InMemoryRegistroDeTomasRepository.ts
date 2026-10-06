import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryRegistroDeTomasRepository implements RegistroDeTomasRepository {
  private readonly tomas = new Map<string, TomaRegistrada>();
  async registrar(toma: TomaRegistrada) {
    this.tomas.set(toma.tomaId, toma);
  }
  async tomadasDesde(fecha: Date) {
    return [...this.tomas.values()].filter((t) => t.tomadaEn.getTime() >= fecha.getTime()).map((t) => t.tomaId);
  }
}

import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryIndicacionesRepository implements IndicacionesRepository {
  private readonly porConsulta = new Map<string, Indicacion[]>();
  async listar(consultaId: string) {
    return [...(this.porConsulta.get(consultaId) ?? [])];
  }
  async guardar(consultaId: string, i: Indicacion) {
    this.porConsulta.set(consultaId, [...(this.porConsulta.get(consultaId) ?? []).filter((x) => x.id !== i.id), i]);
  }
  async quitar(consultaId: string, id: string) {
    this.porConsulta.set(consultaId, (this.porConsulta.get(consultaId) ?? []).filter((x) => x.id !== id));
  }
}

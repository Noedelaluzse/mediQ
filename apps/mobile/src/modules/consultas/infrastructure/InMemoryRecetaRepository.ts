import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryRecetaRepository implements RecetaRepository {
  private readonly porConsulta = new Map<string, Medicamento[]>();
  async obtener(consultaId: string) {
    return [...(this.porConsulta.get(consultaId) ?? [])];
  }
  async guardar(consultaId: string, medicamentos: Medicamento[]) {
    this.porConsulta.set(consultaId, medicamentos);
  }
  async quitar(consultaId: string) {
    this.porConsulta.delete(consultaId);
  }
}

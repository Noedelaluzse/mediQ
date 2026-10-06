import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryFotoDeRecetaRepository implements FotoDeRecetaRepository {
  private readonly porConsulta = new Map<string, { foto: FotoDeReceta; uri: string }>();
  async obtener(consultaId: string) {
    return this.porConsulta.get(consultaId) ?? null;
  }
  async guardar(consultaId: string, foto: FotoDeReceta, base64: string) {
    this.porConsulta.set(consultaId, { foto, uri: `data:${foto.tipoMime};base64,${base64}` });
  }
  async quitar(consultaId: string) {
    this.porConsulta.delete(consultaId);
  }
}

import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RecordatorioDeToma } from '../domain/Toma';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryRecordatoriosDeTomaRepository implements RecordatoriosDeTomaRepository {
  private readonly porConsulta = new Map<string, RecordatorioDeToma[]>();
  async listar() {
    return [...this.porConsulta.values()].flat();
  }
  async listarActivos(desde: Date) {
    return [...this.porConsulta.values()].flat().filter((r) => r.hasta.getTime() > desde.getTime());
  }
  async reemplazarDe(consultaId: string, recordatorios: RecordatorioDeToma[]) {
    if (recordatorios.length === 0) this.porConsulta.delete(consultaId);
    else this.porConsulta.set(consultaId, recordatorios);
  }
  async quitarDe(consultaId: string) {
    this.porConsulta.delete(consultaId);
  }
}

import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import { esTomaDeMedicamento } from '../domain/Toma';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryRegistroDeTomasRepository implements RegistroDeTomasRepository {
  private readonly tomas = new Map<string, TomaRegistrada>();
  async registrar(toma: TomaRegistrada) {
    this.tomas.set(toma.tomaId, toma);
  }
  async tomadasDesde(fecha: Date) {
    return [...this.tomas.values()].filter((t) => t.tomadaEn.getTime() >= fecha.getTime()).map((t) => ({ tomaId: t.tomaId, tomadaEn: t.tomadaEn }));
  }
  async deshacer(tomaId: string) {
    this.tomas.delete(tomaId);
  }
  async quitarDeMedicamento(consultaId: string, medicamentoId: string) {
    for (const id of [...this.tomas.keys()]) if (esTomaDeMedicamento(id, consultaId, medicamentoId)) this.tomas.delete(id);
  }
}

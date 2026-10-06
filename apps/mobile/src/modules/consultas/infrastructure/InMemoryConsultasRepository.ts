import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';

/** Modo simulado (sin Firebase): se guardan en memoria y se pierden al cerrar la app. */
export class InMemoryConsultasRepository implements ConsultaRepository {
  readonly guardadas: Consulta[] = [];
  async guardar(c: Consulta) {
    this.guardadas.push(c);
  }
  async actualizar(c: Consulta) {
    const i = this.guardadas.findIndex((x) => x.id === c.id);
    if (i >= 0) this.guardadas[i] = c;
  }
  async eliminar(id: string) {
    const i = this.guardadas.findIndex((x) => x.id === id);
    if (i >= 0) this.guardadas.splice(i, 1);
  }
}

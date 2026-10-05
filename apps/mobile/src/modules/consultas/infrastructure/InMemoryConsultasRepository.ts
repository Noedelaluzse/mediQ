import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';

/** Modo simulado (sin Firebase): se guardan en memoria y se pierden al cerrar la app. */
export class InMemoryConsultasRepository implements ConsultaRepository {
  readonly guardadas: Consulta[] = [];
  async guardar(c: Consulta) {
    this.guardadas.push(c);
  }
}

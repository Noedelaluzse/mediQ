import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';

/** Modo simulado: no hay consultas que abrir. */
export class InMemoryDetalleDeConsultaRepository implements DetalleDeConsultaRepository {
  async obtener() {
    return null;
  }
}

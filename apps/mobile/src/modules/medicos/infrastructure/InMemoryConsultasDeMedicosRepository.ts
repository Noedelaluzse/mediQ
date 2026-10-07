import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';

/** Modo simulado: todavía no existen consultas que leer. */
export class InMemoryConsultasDeMedicosRepository implements ConsultasDeMedicosRepository {
  async resumenPorMedico() {
    return new Map();
  }
  async deMedico() {
    return [];
  }
  async totales() {
    return { consultas: 0, conReceta: 0 };
  }
}

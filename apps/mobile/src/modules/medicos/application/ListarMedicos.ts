import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

const clave = (m: Medico) =>
  m.nombreCompleto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export class ListarMedicos {
  constructor(private readonly medicos: MedicosRepository) {}

  async ejecutar(): Promise<Medico[]> {
    return (await this.medicos.listar()).sort((a, b) => clave(a).localeCompare(clave(b), 'es'));
  }
}

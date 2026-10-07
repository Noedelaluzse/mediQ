import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { MedicosRepository } from '../domain/MedicosRepository';

export class ResumenDePerfil {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(): Promise<{ medicos: number; consultas: number; recetas: number }> {
    const [medicos, totales] = await Promise.all([this.medicos.listar(), this.consultas.totales()]);
    return { medicos: medicos.length, consultas: totales.consultas, recetas: totales.conReceta };
  }
}

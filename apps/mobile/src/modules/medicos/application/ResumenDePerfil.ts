import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { MedicosRepository } from '../domain/MedicosRepository';

export class ResumenDePerfil {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(): Promise<{ medicos: number; consultas: number; recetas: number }> {
    const [medicos, consultas, recetas] = await Promise.all([this.medicos.listar(), this.consultas.contarTodas(), this.consultas.contarConReceta()]);
    return { medicos: medicos.length, consultas, recetas };
  }
}

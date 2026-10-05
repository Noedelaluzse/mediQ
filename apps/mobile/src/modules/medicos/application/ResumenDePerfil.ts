import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { MedicosRepository } from '../domain/MedicosRepository';

export class ResumenDePerfil {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(): Promise<{ medicos: number; consultas: number }> {
    const [medicos, consultas] = await Promise.all([this.medicos.listar(), this.consultas.contarTodas()]);
    return { medicos: medicos.length, consultas };
  }
}

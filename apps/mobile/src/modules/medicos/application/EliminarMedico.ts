import { err, ok, type Result } from '@/shared/kernel/Result';

import { MedicoConConsultasError, MedicoNoEncontradoError } from '../domain/errors';
import type { MedicosRepository } from '../domain/MedicosRepository';

export class EliminarMedico {
  constructor(private readonly medicos: MedicosRepository) {}

  async ejecutar(id: string): Promise<Result<void, MedicoNoEncontradoError | MedicoConConsultasError>> {
    if (!(await this.medicos.obtener(id))) return err(new MedicoNoEncontradoError());
    const consultas = await this.medicos.contarConsultas(id);
    if (consultas > 0) return err(new MedicoConConsultasError(consultas));
    await this.medicos.eliminar(id);
    return ok(undefined);
  }
}

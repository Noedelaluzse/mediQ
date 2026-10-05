import { err, ok, type Result } from '@/shared/kernel/Result';

import { MedicoNoEncontradoError, type EspecialidadInvalidaError, type NombreDeMedicoRequeridoError } from '../domain/errors';
import { crearMedico, type Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

export interface EntradaGuardarMedico {
  /** Si viene, se edita ese médico; si no, se crea uno nuevo. */
  id?: string;
  nombre: string;
  especialidad: string;
  telefono?: string;
  cedula?: string;
  notas?: string;
}

export class GuardarMedico {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly generarId: () => string,
  ) {}

  async ejecutar(
    e: EntradaGuardarMedico,
  ): Promise<Result<Medico, NombreDeMedicoRequeridoError | EspecialidadInvalidaError | MedicoNoEncontradoError>> {
    if (e.id && !(await this.medicos.obtener(e.id))) return err(new MedicoNoEncontradoError());
    const r = crearMedico({ ...e, id: e.id ?? this.generarId() });
    if (!r.ok) return r;
    await this.medicos.guardar(r.value);
    return ok(r.value);
  }
}

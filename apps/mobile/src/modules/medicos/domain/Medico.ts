import { err, ok, type Result } from '@/shared/kernel/Result';

import { EspecialidadInvalidaError, NombreDeMedicoRequeridoError } from './errors';

export { ESPECIALIDAD_POR_DEFECTO, ESPECIALIDADES, nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

export interface Medico {
  id: string;
  nombreCompleto: string;
  especialidad: string;
  telefono?: string;
  cedula?: string;
  notas?: string;
}

export interface DatosDeMedico {
  id: string;
  nombre: string;
  especialidad: string;
  telefono?: string;
  cedula?: string;
  notas?: string;
}

const opcional = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

export const crearMedico = (d: DatosDeMedico): Result<Medico, NombreDeMedicoRequeridoError | EspecialidadInvalidaError> => {
  const nombreCompleto = d.nombre.trim();
  if (!nombreCompleto) return err(new NombreDeMedicoRequeridoError());
  if (!ESPECIALIDADES.some((e) => e.slug === d.especialidad)) return err(new EspecialidadInvalidaError(d.especialidad));
  return ok({
    id: d.id,
    nombreCompleto,
    especialidad: d.especialidad,
    telefono: opcional(d.telefono),
    cedula: opcional(d.cedula),
    notas: opcional(d.notas),
  });
};

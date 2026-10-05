import { err, ok, type Result } from '@/shared/kernel/Result';

import { EspecialidadInvalidaError, NombreDeMedicoRequeridoError } from './errors';

export const ESPECIALIDADES = [
  { slug: 'cardiologia', nombre: 'Cardiología' },
  { slug: 'dermatologia', nombre: 'Dermatología' },
  { slug: 'ginecologia', nombre: 'Ginecología' },
  { slug: 'medicina-general', nombre: 'Medicina general' },
  { slug: 'medicina-interna', nombre: 'Medicina interna' },
  { slug: 'odontologia', nombre: 'Odontología' },
  { slug: 'oftalmologia', nombre: 'Oftalmología' },
  { slug: 'pediatria', nombre: 'Pediatría' },
  { slug: 'traumatologia', nombre: 'Traumatología' },
  { slug: 'otra', nombre: 'Otra' },
] as const;

export const ESPECIALIDAD_POR_DEFECTO = 'medicina-general';

export const nombreDeEspecialidad = (slug: string): string =>
  ESPECIALIDADES.find((e) => e.slug === slug)?.nombre ?? 'Otra';

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

import {
  LugarDuplicadoError,
  MedicoConConsultasError,
  NombreDeLugarInvalidoError,
  NombreDeMedicoRequeridoError,
} from '../domain/errors';

export const detalleDeConsultas = (n: number): string =>
  n === 0 ? 'Sin consultas' : n === 1 ? '1 consulta' : `${n} consultas`;

/** Texto sencillo para el usuario según el error del dominio. */
export function mensajeDeError(error: Error): string {
  if (error instanceof NombreDeMedicoRequeridoError) return 'Escribe el nombre del médico';
  if (error instanceof NombreDeLugarInvalidoError) return 'Escribe un nombre de hasta 80 caracteres';
  if (error instanceof LugarDuplicadoError) return 'Ya tienes un lugar con ese nombre';
  if (error instanceof MedicoConConsultasError) {
    return `Este médico tiene ${detalleDeConsultas(error.consultas)} registrada(s). Para conservar tu historial no se puede eliminar.`;
  }
  return 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
}

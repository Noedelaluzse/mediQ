import {
  DatosDeMedicoIncompletosError,
  DemasiadasIndicacionesError,
  FechaFuturaError,
  IndicacionInvalidaError,
  LugarInvalidoError,
  ProximaCitaInvalidaError,
} from '../domain/errors';

export function mensajeDeErrorDeConsulta(error: Error): string {
  if (error instanceof FechaFuturaError) return 'La fecha de la consulta no puede ser futura';
  if (error instanceof ProximaCitaInvalidaError) return 'La próxima cita debe ser después de la consulta';
  if (error instanceof DatosDeMedicoIncompletosError) return 'Escribe el nombre del médico o borra su teléfono y cédula';
  if (error instanceof LugarInvalidoError) return 'El nombre del lugar debe tener hasta 80 caracteres';
  if (error instanceof IndicacionInvalidaError) return 'Escribe una indicación de hasta 300 caracteres';
  if (error instanceof DemasiadasIndicacionesError) return 'Puedes guardar hasta 30 indicaciones por consulta';
  return 'No pudimos guardar la consulta. Revisa tu conexión e inténtalo de nuevo.';
}

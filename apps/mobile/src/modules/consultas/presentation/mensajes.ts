import { DatosDeMedicoIncompletosError, FechaFuturaError, LugarInvalidoError, ProximaCitaInvalidaError } from '../domain/errors';

export function mensajeDeErrorDeConsulta(error: Error): string {
  if (error instanceof FechaFuturaError) return 'La fecha de la consulta no puede ser futura';
  if (error instanceof ProximaCitaInvalidaError) return 'La próxima cita debe ser después de la consulta';
  if (error instanceof DatosDeMedicoIncompletosError) return 'Escribe el nombre del médico o borra su teléfono y cédula';
  if (error instanceof LugarInvalidoError) return 'El nombre del lugar debe tener hasta 80 caracteres';
  return 'No pudimos guardar la consulta. Revisa tu conexión e inténtalo de nuevo.';
}

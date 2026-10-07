import {
  DatosDeMedicoIncompletosError,
  DemasiadasIndicacionesError,
  FechaFuturaError,
  FotoInvalidaError,
  IndicacionInvalidaError,
  DemasiadosMedicamentosError,
  LugarInvalidoError,
  MedicamentoInvalidoError,
  RecordatorioInvalidoError,
  ProximaCitaInvalidaError,
} from '../domain/errors';
import { MENSAJE_GENERAL_DE_RECETA } from './erroresDeReceta';

export function mensajeDeErrorDeConsulta(error: Error): string {
  if (error instanceof FechaFuturaError) return 'La fecha de la consulta no puede ser futura';
  if (error instanceof ProximaCitaInvalidaError) return 'La próxima cita debe ser después de la consulta';
  if (error instanceof DatosDeMedicoIncompletosError) return 'Escribe el nombre del médico o borra su teléfono y cédula';
  if (error instanceof LugarInvalidoError) return 'El nombre del lugar debe tener hasta 80 caracteres';
  if (error instanceof IndicacionInvalidaError) return 'Escribe una indicación de hasta 300 caracteres';
  if (error instanceof DemasiadasIndicacionesError) return 'Puedes guardar hasta 30 indicaciones por consulta';
  if (error instanceof MedicamentoInvalidoError) return MENSAJE_GENERAL_DE_RECETA;
  if (error instanceof RecordatorioInvalidoError) return 'Para el aviso elige la hora de la primera toma y una frecuencia y duración de la lista';
  if (error instanceof DemasiadosMedicamentosError) return 'Puedes guardar hasta 20 medicamentos por receta';
  if (error instanceof FotoInvalidaError) return 'La foto debe ser una imagen JPEG de hasta 5 MB';
  return 'No pudimos guardar la consulta. Revisa tu conexión e inténtalo de nuevo.';
}

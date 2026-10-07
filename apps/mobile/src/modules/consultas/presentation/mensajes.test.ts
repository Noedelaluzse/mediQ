import { describe, expect, it } from 'vitest';

import { DatosDeMedicoIncompletosError, DemasiadasIndicacionesError, DemasiadosMedicamentosError, FechaFuturaError, FotoInvalidaError, IndicacionInvalidaError, LugarInvalidoError, MedicamentoInvalidoError, ProximaCitaInvalidaError } from '../domain/errors';
import { mensajeDeErrorDeConsulta } from './mensajes';

describe('mensajeDeErrorDeConsulta', () => {
  it('fecha futura', () => {
    expect(mensajeDeErrorDeConsulta(new FechaFuturaError())).toBe('La fecha de la consulta no puede ser futura');
  });
  it('próxima cita anterior', () => {
    expect(mensajeDeErrorDeConsulta(new ProximaCitaInvalidaError())).toBe('La próxima cita debe ser después de la consulta');
  });
  it('datos del médico sin nombre', () => {
    expect(mensajeDeErrorDeConsulta(new DatosDeMedicoIncompletosError())).toBe('Escribe el nombre del médico o borra su teléfono y cédula');
  });
  it('lugar demasiado largo', () => {
    expect(mensajeDeErrorDeConsulta(new LugarInvalidoError())).toBe('El nombre del lugar debe tener hasta 80 caracteres');
  });
  it('indicación vacía o larga', () => {
    expect(mensajeDeErrorDeConsulta(new IndicacionInvalidaError())).toBe('Escribe una indicación de hasta 300 caracteres');
  });
  it('demasiadas indicaciones', () => {
    expect(mensajeDeErrorDeConsulta(new DemasiadasIndicacionesError())).toBe('Puedes guardar hasta 30 indicaciones por consulta');
  });
  it('cualquier otro error', () => {
    expect(mensajeDeErrorDeConsulta(new Error('x'))).toBe('No pudimos guardar la consulta. Revisa tu conexión e inténtalo de nuevo.');
  });
  it('medicamento inválido y demasiados medicamentos', () => {
    expect(mensajeDeErrorDeConsulta(new MedicamentoInvalidoError())).toBe('Revisa los datos del medicamento');
    expect(mensajeDeErrorDeConsulta(new DemasiadosMedicamentosError())).toBe('Puedes guardar hasta 20 medicamentos por receta');
  });
  it('foto inválida', () => {
    expect(mensajeDeErrorDeConsulta(new FotoInvalidaError())).toBe('La foto debe ser una imagen JPEG de hasta 5 MB');
  });
});

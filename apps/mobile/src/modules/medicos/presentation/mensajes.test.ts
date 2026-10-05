import { describe, expect, it } from 'vitest';

import {
  LugarDuplicadoError,
  MedicoConConsultasError,
  NombreDeLugarInvalidoError,
  NombreDeMedicoRequeridoError,
} from '../domain/errors';
import { detalleDeConsultas, mensajeDeError } from './mensajes';

describe('mensajeDeError', () => {
  it('nombre de médico vacío', () => {
    expect(mensajeDeError(new NombreDeMedicoRequeridoError())).toBe('Escribe el nombre del médico');
  });

  it('lugar con nombre vacío o demasiado largo', () => {
    expect(mensajeDeError(new NombreDeLugarInvalidoError())).toBe('Escribe un nombre de hasta 80 caracteres');
  });

  it('lugar repetido', () => {
    expect(mensajeDeError(new LugarDuplicadoError())).toBe('Ya tienes un lugar con ese nombre');
  });

  it('médico con consultas dice cuántas, en singular y plural', () => {
    expect(mensajeDeError(new MedicoConConsultasError(1))).toContain('1 consulta');
    expect(mensajeDeError(new MedicoConConsultasError(3))).toContain('3 consultas');
  });

  it('cualquier otro error da un mensaje genérico', () => {
    expect(mensajeDeError(new Error('x'))).toBe('No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.');
  });
});

describe('detalleDeConsultas', () => {
  it('describe 0, 1 y varias consultas', () => {
    expect(detalleDeConsultas(0)).toBe('Sin consultas');
    expect(detalleDeConsultas(1)).toBe('1 consulta');
    expect(detalleDeConsultas(6)).toBe('6 consultas');
  });
});

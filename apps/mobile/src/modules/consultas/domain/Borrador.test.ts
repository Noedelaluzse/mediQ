import { describe, expect, it } from 'vitest';

import { esBorradorVacio, type BorradorDeConsulta } from './Borrador';

const vacio: BorradorDeConsulta = {
  fecha: '2026-10-05T09:30:00.000Z',
  hora: '2026-10-05T09:30:00.000Z',
  tipo: 'general',
  especialidad: 'medicina-general',
  lugar: '',
  consultorio: '',
  medicoNombre: '',
  medicoTelefono: '',
  medicoCedula: '',
  motivo: '',
  indicaciones: '',
  proximaCita: null,
};

describe('esBorradorVacio', () => {
  it('un formulario sin escribir nada es vacío (aunque tenga fecha, tipo y especialidad por defecto)', () => {
    expect(esBorradorVacio(vacio)).toBe(true);
  });

  it('espacios en blanco no cuentan como escrito', () => {
    expect(esBorradorVacio({ ...vacio, motivo: '   ', indicaciones: '\n' })).toBe(true);
  });

  it.each(['lugar', 'consultorio', 'medicoNombre', 'medicoTelefono', 'medicoCedula', 'motivo', 'indicaciones'] as const)(
    'escribir algo en %s ya es un borrador',
    (campo) => {
      expect(esBorradorVacio({ ...vacio, [campo]: 'x' })).toBe(false);
    },
  );

  it('una próxima cita elegida ya es un borrador', () => {
    expect(esBorradorVacio({ ...vacio, proximaCita: '2026-10-19T10:30:00.000Z' })).toBe(false);
  });
});

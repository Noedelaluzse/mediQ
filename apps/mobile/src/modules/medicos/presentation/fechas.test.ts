import { describe, expect, it } from 'vitest';

import { fechaCorta, fechaConAnio, resumenDeConsultas } from './fechas';

describe('fechas en español', () => {
  it('fecha corta: día y mes abreviado', () => {
    expect(fechaCorta(new Date(2026, 8, 28))).toBe('28 sep');
    expect(fechaCorta(new Date(2026, 0, 3))).toBe('3 ene');
  });

  it('fecha con año', () => {
    expect(fechaConAnio(new Date(2026, 3, 3))).toBe('3 abr 2026');
  });

  it('cubre los doce meses', () => {
    const meses = Array.from({ length: 12 }, (_, i) => fechaCorta(new Date(2026, i, 1)).split(' ')[1]);
    expect(meses).toEqual(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']);
  });
});

describe('resumenDeConsultas (línea de la lista)', () => {
  it('con consultas: número y última visita', () => {
    expect(resumenDeConsultas(4, new Date(2026, 8, 28))).toBe('4 consultas · última 28 sep');
    expect(resumenDeConsultas(1, new Date(2026, 8, 2))).toBe('1 consulta · última 2 sep');
  });

  it('sin consultas', () => {
    expect(resumenDeConsultas(0)).toBe('Sin consultas');
  });

  it('con consultas pero sin fecha legible solo muestra el número', () => {
    expect(resumenDeConsultas(2)).toBe('2 consultas');
  });
});

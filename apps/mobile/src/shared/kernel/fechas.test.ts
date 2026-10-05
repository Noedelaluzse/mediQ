import { describe, expect, it } from 'vitest';

import { diaDeLaSemanaCorto, fechaConAnio, fechaLargaConAnio, fechaYHoraLarga, fechaCorta, fechaDeHoy, horaCorta, mesYAnio } from './fechas';

describe('fechas compartidas', () => {
  it('fecha corta y con año', () => {
    expect(fechaCorta(new Date(2026, 8, 28))).toBe('28 sep');
    expect(fechaConAnio(new Date(2026, 3, 3))).toBe('3 abr 2026');
  });

  it('hora de 24 h con ceros a la izquierda', () => {
    expect(horaCorta(new Date(2026, 9, 4, 9, 5))).toBe('09:05');
    expect(horaCorta(new Date(2026, 9, 4, 18, 30))).toBe('18:30');
  });

  it('día de la semana abreviado', () => {
    expect(diaDeLaSemanaCorto(new Date(2026, 8, 28))).toBe('lun');
    expect(diaDeLaSemanaCorto(new Date(2026, 8, 2))).toBe('mié');
    expect(diaDeLaSemanaCorto(new Date(2026, 9, 4))).toBe('dom');
    expect(diaDeLaSemanaCorto(new Date(2026, 9, 10))).toBe('sáb');
  });

  it('mes y año con el mes en mayúscula inicial', () => {
    expect(mesYAnio(new Date(2026, 8, 28))).toBe('Septiembre 2026');
    expect(mesYAnio(new Date(2027, 0, 1))).toBe('Enero 2027');
  });

  it('fecha de hoy larga: "Domingo 4 de octubre"', () => {
    expect(fechaDeHoy(new Date(2026, 9, 4))).toBe('Domingo 4 de octubre');
    expect(fechaDeHoy(new Date(2026, 8, 28))).toBe('Lunes 28 de septiembre');
  });

  it('fecha larga con año y con hora', () => {
    expect(fechaLargaConAnio(new Date(2026, 8, 28))).toBe('Lunes 28 de septiembre de 2026');
    expect(fechaYHoraLarga(new Date(2026, 8, 28, 11, 0))).toBe('Lunes 28 de septiembre de 2026 · 11:00');
  });
});

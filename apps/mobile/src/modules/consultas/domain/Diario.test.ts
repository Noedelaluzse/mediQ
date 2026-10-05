import { describe, expect, it } from 'vitest';

import { agruparPorMes, type ConsultaDelDiario } from './Diario';

const c = (id: string, y: number, m: number, d: number, extra: Partial<ConsultaDelDiario> = {}): ConsultaDelDiario => ({
  id,
  fecha: new Date(y, m - 1, d, 10, 0),
  especialidad: 'cardiologia',
  tipo: 'especialista',
  ...extra,
});

describe('agruparPorMes (RF-12, HU-07)', () => {
  it('sin consultas no hay grupos', () => {
    expect(agruparPorMes([])).toEqual([]);
  });

  it('agrupa por mes conservando el orden de más reciente a más antigua', () => {
    const grupos = agruparPorMes([c('a', 2026, 9, 28), c('b', 2026, 9, 15), c('c', 2026, 8, 20), c('d', 2026, 7, 1)]);
    expect(grupos.map((g) => [g.titulo, g.consultas.map((x) => x.id)])).toEqual([
      ['Septiembre 2026', ['a', 'b']],
      ['Agosto 2026', ['c']],
      ['Julio 2026', ['d']],
    ]);
  });

  it('cada grupo trae el número de consultas', () => {
    const grupos = agruparPorMes([c('a', 2026, 9, 28), c('b', 2026, 9, 15), c('c', 2026, 8, 20)]);
    expect(grupos.map((g) => g.total)).toEqual([2, 1]);
  });

  it('el mismo mes de otro año es otro grupo', () => {
    const grupos = agruparPorMes([c('a', 2026, 9, 1), c('b', 2025, 9, 30)]);
    expect(grupos.map((g) => g.titulo)).toEqual(['Septiembre 2026', 'Septiembre 2025']);
  });

  it('cada grupo tiene una clave única y estable (año-mes)', () => {
    const grupos = agruparPorMes([c('a', 2026, 9, 28), c('b', 2026, 1, 5)]);
    expect(grupos.map((g) => g.clave)).toEqual(['2026-09', '2026-01']);
  });

  it('ordena aunque la lista llegue desordenada', () => {
    const grupos = agruparPorMes([c('viejo', 2026, 7, 1), c('nuevo', 2026, 9, 28)]);
    expect(grupos.map((g) => g.clave)).toEqual(['2026-09', '2026-07']);
  });

  it('dentro del mes la más reciente va primero', () => {
    const grupos = agruparPorMes([c('a', 2026, 9, 2), c('b', 2026, 9, 28)]);
    expect(grupos[0].consultas.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

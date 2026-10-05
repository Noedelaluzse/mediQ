import { describe, expect, it } from 'vitest';

import { fechaConAnio, fechaCorta, horaCorta } from './fechas';

describe('fechas compartidas', () => {
  it('fecha corta y con año', () => {
    expect(fechaCorta(new Date(2026, 8, 28))).toBe('28 sep');
    expect(fechaConAnio(new Date(2026, 3, 3))).toBe('3 abr 2026');
  });

  it('hora de 24 h con ceros a la izquierda', () => {
    expect(horaCorta(new Date(2026, 9, 4, 9, 5))).toBe('09:05');
    expect(horaCorta(new Date(2026, 9, 4, 18, 30))).toBe('18:30');
  });
});

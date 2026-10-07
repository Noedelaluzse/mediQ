import { describe, expect, it } from 'vitest';

import { enlaceDeLlamada } from './llamada';

describe('enlaceDeLlamada', () => {
  it('deja solo los dígitos', () => {
    expect(enlaceDeLlamada('998 494 7274')).toBe('tel:9984947274');
    expect(enlaceDeLlamada('(998) 494-7274')).toBe('tel:9984947274');
  });

  it('conserva el + inicial de los números internacionales', () => {
    expect(enlaceDeLlamada('+52 998 494 7274')).toBe('tel:+529984947274');
  });

  it('un + que no está al inicio se descarta', () => {
    expect(enlaceDeLlamada('998+4947274')).toBe('tel:9984947274');
  });

  it('sin dígitos suficientes no hay a quién llamar', () => {
    expect(enlaceDeLlamada('')).toBeNull();
    expect(enlaceDeLlamada('ext. s/n')).toBeNull();
    expect(enlaceDeLlamada('12')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { esquemaNativo, leerPreferenciaDeTema, temaEfectivo } from './preferencia';

describe('leerPreferenciaDeTema', () => {
  it('acepta las tres opciones válidas', () => {
    expect(leerPreferenciaDeTema('claro')).toBe('claro');
    expect(leerPreferenciaDeTema('oscuro')).toBe('oscuro');
    expect(leerPreferenciaDeTema('automatico')).toBe('automatico');
  });

  it('nada guardado, texto dañado u otro valor cuenta como automático', () => {
    expect(leerPreferenciaDeTema(null)).toBe('automatico');
    expect(leerPreferenciaDeTema('')).toBe('automatico');
    expect(leerPreferenciaDeTema('azul')).toBe('automatico');
    expect(leerPreferenciaDeTema('{"x":1}')).toBe('automatico');
  });
});

describe('temaEfectivo', () => {
  it('claro y oscuro ignoran el teléfono', () => {
    expect(temaEfectivo('claro', 'dark')).toBe('claro');
    expect(temaEfectivo('oscuro', 'light')).toBe('oscuro');
  });

  it('automático sigue al teléfono, y si no se sabe usa claro', () => {
    expect(temaEfectivo('automatico', 'dark')).toBe('oscuro');
    expect(temaEfectivo('automatico', 'light')).toBe('claro');
    expect(temaEfectivo('automatico', null)).toBe('claro');
    expect(temaEfectivo('automatico', undefined)).toBe('claro');
  });
});

describe('esquemaNativo (lo que se le pide al sistema para teclado, alertas y barra de estado)', () => {
  it('fuerza light u dark, y en automático lo suelta', () => {
    expect(esquemaNativo('claro')).toBe('light');
    expect(esquemaNativo('oscuro')).toBe('dark');
    expect(esquemaNativo('automatico')).toBe('unspecified');
  });
});

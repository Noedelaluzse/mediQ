import { describe, expect, it } from 'vitest';

import { textoDelContador } from './contadoresDelPerfil';

describe('textoDelContador (F053: nunca un 0 inventado)', () => {
  it('muestra el número cuando se pudo leer, incluido un 0 verdadero', () => {
    expect(textoDelContador(12, false)).toBe('12');
    expect(textoDelContador(0, false)).toBe('0');
  });

  it('mientras carga no muestra nada (el esqueleto)', () => {
    expect(textoDelContador(undefined, false)).toBeNull();
  });

  it('si no se pudo leer muestra un guion, no un 0 que parezca un dato', () => {
    expect(textoDelContador(undefined, true)).toBe('—');
  });

  it('si ya había un número y falla una lectura posterior, se conserva el número', () => {
    expect(textoDelContador(7, true)).toBe('7');
  });
});

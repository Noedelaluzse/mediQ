import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';
import { tema } from './index';

describe('contrastRatio', () => {
  it('es 21 entre negro y blanco', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('es 1 entre colores iguales', () => {
    expect(contrastRatio('#0B6654', '#0B6654')).toBeCloseTo(1, 5);
  });

  it('no depende del orden', () => {
    expect(contrastRatio('#14211D', '#F3F5F2')).toBeCloseTo(contrastRatio('#F3F5F2', '#14211D'), 5);
  });
});

describe('tema activo (RNF-16: contraste mínimo 4.5:1)', () => {
  it('texto sobre fondo', () => {
    expect(contrastRatio(tema.color.texto, tema.color.fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('sobrePrimario sobre primario', () => {
    expect(contrastRatio(tema.color.sobrePrimario, tema.color.primario)).toBeGreaterThanOrEqual(4.5);
  });
});

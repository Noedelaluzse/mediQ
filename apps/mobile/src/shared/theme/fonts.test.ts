import { describe, expect, it } from 'vitest';

import { NOMBRES_DE_FUENTE } from './fonts';
import { tema } from './temas';

describe('fuentes del tema', () => {
  it('el título usa Bricolage Grotesque y el cuerpo Figtree', () => {
    expect(tema.fuente.titulo).toBe('BricolageGrotesque-Bold');
    expect(tema.fuente.cuerpo).toBe('Figtree-Regular');
  });

  it('define los pesos de Figtree usados en el diseño', () => {
    expect(tema.fuente.cuerpoMedio).toBe('Figtree-Medium');
    expect(tema.fuente.cuerpoSemi).toBe('Figtree-SemiBold');
    expect(tema.fuente.cuerpoBold).toBe('Figtree-Bold');
  });

  it('cada fuente del tema está registrada en NOMBRES_DE_FUENTE', () => {
    for (const nombre of Object.values(tema.fuente)) {
      expect(NOMBRES_DE_FUENTE).toContain(nombre);
    }
  });
});

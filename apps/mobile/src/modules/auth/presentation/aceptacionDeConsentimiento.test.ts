import { describe, expect, it } from 'vitest';

import { puedeContinuar, TEXTO_DE_ACEPTACION_DEL_AVISO, TEXTO_DE_ACEPTACION_DE_TERMINOS } from './aceptacionDeConsentimiento';

describe('puedeContinuar (hay que marcar las dos casillas)', () => {
  it('solo con las dos aceptadas', () => {
    expect(puedeContinuar({ aviso: true, terminos: true })).toBe(true);
    expect(puedeContinuar({ aviso: true, terminos: false })).toBe(false);
    expect(puedeContinuar({ aviso: false, terminos: true })).toBe(false);
    expect(puedeContinuar({ aviso: false, terminos: false })).toBe(false);
  });
});

describe('textos de las casillas', () => {
  it('la del aviso pide consentimiento EXPRESO para datos sensibles de salud', () => {
    expect(TEXTO_DE_ACEPTACION_DEL_AVISO.toLowerCase()).toContain('consentimiento expreso');
    expect(TEXTO_DE_ACEPTACION_DEL_AVISO.toLowerCase()).toContain('salud');
  });

  it('la de términos es independiente de la del aviso', () => {
    expect(TEXTO_DE_ACEPTACION_DE_TERMINOS.toLowerCase()).toContain('términos');
    expect(TEXTO_DE_ACEPTACION_DE_TERMINOS).not.toBe(TEXTO_DE_ACEPTACION_DEL_AVISO);
  });
});

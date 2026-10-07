import { describe, expect, it } from 'vitest';

import { estadoDeLaFoto, TEXTOS_FOTO_SIN_INTERNET } from './fotoSinInternet';

describe('estadoDeLaFoto (F051: la foto de la receta sin internet)', () => {
  it('con internet y foto, se ve normal', () => {
    expect(estadoDeLaFoto({ puedeEditar: true, hayFoto: true })).toBe('normal');
  });

  it('con internet y sin foto, se ofrece agregarla (normal)', () => {
    expect(estadoDeLaFoto({ puedeEditar: true, hayFoto: false })).toBe('normal');
  });

  it('sin internet y con copia en el teléfono, se muestra la copia y se avisa que puede no ser la última', () => {
    expect(estadoDeLaFoto({ puedeEditar: false, hayFoto: true })).toBe('copia');
  });

  it('sin internet y sin copia, no está disponible', () => {
    expect(estadoDeLaFoto({ puedeEditar: false, hayFoto: false })).toBe('no-disponible');
  });

  it('los textos son claros', () => {
    expect(TEXTOS_FOTO_SIN_INTERNET.copia).toMatch(/teléfono/);
    expect(TEXTOS_FOTO_SIN_INTERNET.noDisponible).toMatch(/sin internet/);
  });
});

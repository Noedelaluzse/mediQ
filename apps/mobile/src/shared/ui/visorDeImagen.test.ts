import { describe, expect, it } from 'vitest';

import { ajustarAPantalla, ZOOM_MAXIMO } from './visorDeImagen';

const pantalla = { ancho: 400, alto: 800 };

describe('ajustarAPantalla (la foto completa a la vista, sin recortar ni deformar)', () => {
  it('una foto vertical se ajusta al alto o al ancho, lo que llegue primero', () => {
    // 3:4 en una pantalla de 400×800: por ancho serían 400×533 (cabe en alto).
    expect(ajustarAPantalla({ ancho: 1200, alto: 1600 }, pantalla)).toEqual({ ancho: 400, alto: 533.3333333333334 });
  });

  it('una foto muy alta se ajusta por el alto de la pantalla', () => {
    const r = ajustarAPantalla({ ancho: 500, alto: 2000 }, pantalla);
    expect(r.alto).toBe(800);
    expect(r.ancho).toBe(200);
  });

  it('una foto horizontal se ajusta por el ancho', () => {
    const r = ajustarAPantalla({ ancho: 2000, alto: 1000 }, pantalla);
    expect(r).toEqual({ ancho: 400, alto: 200 });
  });

  it('conserva la proporción de la foto', () => {
    for (const f of [{ ancho: 1200, alto: 1600 }, { ancho: 900, alto: 1200 }, { ancho: 3000, alto: 1000 }]) {
      const r = ajustarAPantalla(f, pantalla);
      expect(r.ancho / r.alto).toBeCloseTo(f.ancho / f.alto, 6);
    }
  });

  it('nunca pasa de los bordes de la pantalla', () => {
    const r = ajustarAPantalla({ ancho: 100, alto: 3000 }, pantalla);
    expect(r.ancho).toBeLessThanOrEqual(pantalla.ancho);
    expect(r.alto).toBeLessThanOrEqual(pantalla.alto);
  });

  it('sin medidas conocidas (fotos viejas) supone una foto vertical 3:4', () => {
    const r = ajustarAPantalla({}, pantalla);
    expect(r.ancho / r.alto).toBeCloseTo(3 / 4, 6);
    expect(ajustarAPantalla({ ancho: 0, alto: 0 }, pantalla)).toEqual(r);
    expect(ajustarAPantalla({ ancho: 1000 }, pantalla)).toEqual(r);
  });

  it('con una pantalla sin tamaño todavía no devuelve basura (cero)', () => {
    expect(ajustarAPantalla({ ancho: 1000, alto: 1000 }, { ancho: 0, alto: 0 })).toEqual({ ancho: 0, alto: 0 });
  });
});

describe('zoom', () => {
  it('se puede acercar varias veces pero no sin límite', () => {
    expect(ZOOM_MAXIMO).toBeGreaterThanOrEqual(3);
    expect(ZOOM_MAXIMO).toBeLessThanOrEqual(6);
  });
});

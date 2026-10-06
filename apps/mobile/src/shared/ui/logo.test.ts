/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LOGO_HORIZONTAL, tamanoDelLogo } from './logo';

/** Lee ancho y alto de la cabecera de un PNG. */
const medidasDelPng = (ruta: string) => {
  const d = readFileSync(resolve(__dirname, '../../..', ruta));
  return { ancho: d.readUInt32BE(16), alto: d.readUInt32BE(20) };
};

describe('tamanoDelLogo (el logo horizontal se dibuja con ancho y alto explícitos)', () => {
  it('las medidas guardadas coinciden con el archivo real: si se cambia la imagen, esta prueba avisa', () => {
    expect(medidasDelPng('assets/images/logo-horizontal.png')).toEqual({ ancho: LOGO_HORIZONTAL.ancho, alto: LOGO_HORIZONTAL.alto });
  });

  it('a 160 puntos de ancho conserva la proporción (no se deforma ni se recorta)', () => {
    const { width, height } = tamanoDelLogo(160);
    expect(width).toBe(160);
    expect(height).toBe(37);
    expect(width / height).toBeCloseTo(LOGO_HORIZONTAL.ancho / LOGO_HORIZONTAL.alto, 1);
  });

  it('escala a cualquier ancho y siempre da números enteros positivos', () => {
    for (const ancho of [80, 120, 200, 320]) {
      const { width, height } = tamanoDelLogo(ancho);
      expect(width).toBe(ancho);
      expect(Number.isInteger(height) && height > 0).toBe(true);
    }
  });

  it('nunca pide un logo más ancho que la imagen (se vería borroso)', () => {
    expect(tamanoDelLogo(5000).width).toBe(LOGO_HORIZONTAL.ancho);
  });
});

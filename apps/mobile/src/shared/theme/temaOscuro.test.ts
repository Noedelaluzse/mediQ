import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';
import { verde } from './palettes/verde';
import { verdeOscuro } from './palettes/verdeOscuro';
import { crearTema } from './tokens';

const c = crearTema(verdeOscuro).color;
const minimo = 4.5;

describe('verdeOscuro (RNF-16: contraste mínimo 4.5:1)', () => {
  it('define los mismos tokens que la paleta clara, todos con color válido', () => {
    expect(Object.keys(verdeOscuro).sort()).toEqual(Object.keys(verde).sort());
    for (const [, valor] of Object.entries(verdeOscuro)) expect(valor).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(.+\))$/);
  });

  it('es de verdad oscura: el fondo es más oscuro que el texto', () => {
    expect(contrastRatio(c.fondo, '#000000')).toBeLessThan(contrastRatio(c.texto, '#000000'));
    expect(contrastRatio(c.fondo, '#000000')).toBeLessThan(2);
  });

  it('texto y texto secundario sobre fondo y superficie', () => {
    for (const base of [c.fondo, c.superficie]) {
      expect(contrastRatio(c.texto, base)).toBeGreaterThanOrEqual(minimo);
      expect(contrastRatio(c.textoSecundario, base)).toBeGreaterThanOrEqual(minimo);
    }
  });

  it('sobrePrimario sobre primario (botones y avatar)', () => {
    expect(contrastRatio(c.sobrePrimario, c.primario)).toBeGreaterThanOrEqual(minimo);
  });

  it('primario como texto o ícono sobre fondo, superficie y su fondo suave', () => {
    for (const base of [c.fondo, c.superficie, c.primarioSuave]) expect(contrastRatio(c.primario, base)).toBeGreaterThanOrEqual(minimo);
  });

  it('peligro sobre fondo, superficie y su fondo suave', () => {
    for (const base of [c.fondo, c.superficie, c.peligroSuave]) expect(contrastRatio(c.peligro, base)).toBeGreaterThanOrEqual(minimo);
  });

  it('acento de receta sobre fondo, superficie y su fondo suave', () => {
    for (const base of [c.fondo, c.superficie, c.acentoRecetaSuave]) expect(contrastRatio(c.acentoReceta, base)).toBeGreaterThanOrEqual(minimo);
  });

  it('las tarjetas se distinguen del fondo y el esqueleto de ambos', () => {
    expect(c.superficie).not.toBe(c.fondo);
    expect(c.esqueleto).not.toBe(c.fondo);
    expect(c.esqueleto).not.toBe(c.superficie);
    expect(c.bordeCampo).not.toBe(c.borde);
  });

  it('el velo sigue siendo una capa translúcida', () => {
    expect(c.velo).toMatch(/^rgba\(/);
  });
});

describe('sobrePrimario sale de la paleta', () => {
  it('en la paleta verde sigue siendo blanco', () => {
    expect(crearTema(verde).color.sobrePrimario).toBe('#FFFFFF');
  });

  it('otra paleta lo cambia', () => {
    expect(crearTema({ ...verde, onBrand: '#000000' }).color.sobrePrimario).toBe('#000000');
  });
});

import { describe, expect, it } from 'vitest';

import { verde } from './palettes/verde';
import { crearTema } from './tokens';

describe('crearTema', () => {
  const t = crearTema(verde);

  it('traduce la paleta a tokens semánticos', () => {
    expect(t.color.primario).toBe(verde.brand);
    expect(t.color.fondo).toBe(verde.ground);
    expect(t.color.superficie).toBe(verde.surface);
    expect(t.color.acentoReceta).toBe(verde.warm);
    expect(t.color.peligro).toBe(verde.danger);
  });

  it('usa los colores del prototipo', () => {
    expect(verde.brand).toBe('#0B6654');
    expect(verde.ground).toBe('#F3F5F2');
  });

  it('define radios, espacios y fuentes', () => {
    expect(t.radio.lg).toBe(16);
    expect(t.espacio.md).toBe(12);
    expect(t.fuente.titulo).toBe('BricolageGrotesque-Bold');
  });

  it('otra paleta cambia el tema sin tocar más código', () => {
    const azul = { ...verde, brand: '#1D4ED8' };
    expect(crearTema(azul).color.primario).toBe('#1D4ED8');
  });
});

describe('bordes de campo (diseño de formularios)', () => {
  const t = crearTema(verde);

  it('los campos de texto usan un borde más marcado que el de las tarjetas', () => {
    expect(t.color.bordeCampo).toBe('#C9D2CD');
    expect(t.color.bordeCampo).not.toBe(t.color.borde);
  });

  it('las tarjetas vacías usan un borde discontinuo gris', () => {
    expect(t.color.bordeVacio).toBe('#8A9792');
  });
});

describe('velo de ventanas emergentes', () => {
  it('es una capa oscura translúcida', () => {
    expect(crearTema(verde).color.velo).toMatch(/^rgba\(/);
  });
});

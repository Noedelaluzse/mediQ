import { describe, expect, it } from 'vitest';

import { anchosDeTexto, estaCargando, PULSO } from './esqueleto';

describe('estaCargando (cuándo se muestra el esqueleto)', () => {
  it('sin datos todavía y sin error: cargando', () => {
    expect(estaCargando(null, false)).toBe(true);
    expect(estaCargando(undefined, false)).toBe(true);
  });

  it('con datos, aunque sean una lista vacía o cero, ya no está cargando (el estado vacío se muestra aparte)', () => {
    expect(estaCargando([], false)).toBe(false);
    expect(estaCargando(0, false)).toBe(false);
    expect(estaCargando({ a: 1 }, false)).toBe(false);
  });

  it('si falló, no se queda cargando para siempre: aparece el error con «Reintentar»', () => {
    expect(estaCargando(null, true)).toBe(false);
  });
});

describe('anchosDeTexto (las líneas del esqueleto no miden todas igual)', () => {
  it('da tantos anchos como líneas y son porcentajes entre 35 % y 100 %', () => {
    const anchos = anchosDeTexto(5);
    expect(anchos).toHaveLength(5);
    for (const a of anchos) {
      expect(a).toMatch(/^\d+%$/);
      expect(parseInt(a, 10)).toBeGreaterThanOrEqual(35);
      expect(parseInt(a, 10)).toBeLessThanOrEqual(100);
    }
  });

  it('es determinista (no parpadea de forma distinta en cada pintado) y varía entre líneas contiguas', () => {
    expect(anchosDeTexto(4)).toEqual(anchosDeTexto(4));
    const anchos = anchosDeTexto(6);
    for (let i = 1; i < anchos.length; i++) expect(anchos[i]).not.toBe(anchos[i - 1]);
  });

  it('con cero líneas no da nada', () => {
    expect(anchosDeTexto(0)).toEqual([]);
  });
});

describe('PULSO (parpadeo suave)', () => {
  it('va de medio opaco a opaco, sin llegar a desaparecer, en menos de un segundo', () => {
    expect(PULSO.desde).toBeGreaterThanOrEqual(0.3);
    expect(PULSO.desde).toBeLessThan(PULSO.hasta);
    expect(PULSO.hasta).toBe(1);
    expect(PULSO.duracionMs).toBeGreaterThanOrEqual(500);
    expect(PULSO.duracionMs).toBeLessThanOrEqual(1000);
  });
});

import { describe, expect, it } from 'vitest';

import { necesitaRecargar, VIGENCIA_DE_DATOS_MS } from './frescura';

const t0 = 1_000_000;
const cargada = { cuando: t0, version: 3, hayInternet: true };
const igual = { version: 3, hayInternet: true };

describe('necesitaRecargar (P-06: recargar al volver a una pantalla solo si hace falta)', () => {
  it('la vigencia es de 1 minuto', () => {
    expect(VIGENCIA_DE_DATOS_MS).toBe(60_000);
  });

  it('si nunca se cargó, se carga', () => {
    expect(necesitaRecargar(null, { ...igual, ahora: t0 })).toBe(true);
  });

  it('recién cargado y sin cambios, no se vuelve a cargar (se conserva el scroll)', () => {
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + 5_000 })).toBe(false);
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + VIGENCIA_DE_DATOS_MS - 1 })).toBe(false);
  });

  it('pasado el minuto se vuelve a cargar, aunque nada haya cambiado aquí (puede haber cambiado en otro aparato)', () => {
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + VIGENCIA_DE_DATOS_MS })).toBe(true);
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + 10 * VIGENCIA_DE_DATOS_MS })).toBe(true);
  });

  it('si se guardó, editó o borró algo (cambió la versión), se carga de inmediato', () => {
    expect(necesitaRecargar(cargada, { version: 4, hayInternet: true, ahora: t0 + 1 })).toBe(true);
  });

  it('si cambió la conexión (volvió o se fue el internet), se carga: lo leído puede ser una copia vieja', () => {
    expect(necesitaRecargar(cargada, { version: 3, hayInternet: false, ahora: t0 + 1 })).toBe(true);
    expect(necesitaRecargar({ ...cargada, hayInternet: false }, { version: 3, hayInternet: true, ahora: t0 + 1 })).toBe(true);
  });

  it('si el reloj del teléfono retrocedió, no se confía en lo cargado', () => {
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 - 1 })).toBe(true);
  });

  it('acepta otra vigencia', () => {
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + 11 }, 10)).toBe(true);
    expect(necesitaRecargar(cargada, { ...igual, ahora: t0 + 9 }, 10)).toBe(false);
  });
});

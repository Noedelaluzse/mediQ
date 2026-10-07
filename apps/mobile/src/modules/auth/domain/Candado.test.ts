import { describe, expect, it } from 'vitest';

import { GRACIA_DEL_CANDADO_MS, debeBloquear, ofertaDelCandado, preferenciaInicial } from './Candado';

const AHORA = 1_000_000;

describe('debeBloquear (F036)', () => {
  it('con el candado apagado nunca bloquea', () => {
    expect(debeBloquear({ activado: false, salioEnMs: null, ahoraMs: AHORA })).toBe(false);
    expect(debeBloquear({ activado: false, salioEnMs: AHORA - 10 * GRACIA_DEL_CANDADO_MS, ahoraMs: AHORA })).toBe(false);
  });

  it('al abrir la app de cero (nunca salió a segundo plano) siempre bloquea', () => {
    expect(debeBloquear({ activado: true, salioEnMs: null, ahoraMs: AHORA })).toBe(true);
  });

  it('al volver de segundo plano dentro del minuto no bloquea', () => {
    expect(debeBloquear({ activado: true, salioEnMs: AHORA - 5_000, ahoraMs: AHORA })).toBe(false);
    expect(debeBloquear({ activado: true, salioEnMs: AHORA - GRACIA_DEL_CANDADO_MS, ahoraMs: AHORA })).toBe(false);
  });

  it('al volver pasado el minuto bloquea', () => {
    expect(debeBloquear({ activado: true, salioEnMs: AHORA - GRACIA_DEL_CANDADO_MS - 1, ahoraMs: AHORA })).toBe(true);
  });

  it('si el reloj del teléfono retrocedió bloquea, por si acaso', () => {
    expect(debeBloquear({ activado: true, salioEnMs: AHORA + 60_000, ahoraMs: AHORA })).toBe(true);
  });

  it('la gracia es de un minuto', () => {
    expect(GRACIA_DEL_CANDADO_MS).toBe(60_000);
  });
});

describe('ofertaDelCandado', () => {
  it('se ofrece solo si el teléfono lo permite, no está activado y no se ofreció antes', () => {
    expect(ofertaDelCandado({ activado: false, ofrecido: false }, 'disponible')).toBe(true);
  });

  it('no se ofrece si ya se ofreció, si ya está activado o si el teléfono no puede', () => {
    expect(ofertaDelCandado({ activado: false, ofrecido: true }, 'disponible')).toBe(false);
    expect(ofertaDelCandado({ activado: true, ofrecido: true }, 'disponible')).toBe(false);
    expect(ofertaDelCandado({ activado: false, ofrecido: false }, 'sinSensor')).toBe(false);
    expect(ofertaDelCandado({ activado: false, ofrecido: false }, 'sinRegistro')).toBe(false);
  });
});

describe('preferenciaInicial', () => {
  it('empieza apagada y sin ofrecer', () => {
    expect(preferenciaInicial()).toEqual({ activado: false, ofrecido: false });
  });
});

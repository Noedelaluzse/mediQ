import { describe, expect, it } from 'vitest';

import type { TomaDelDia } from '../domain/TomasDelDia';
import { aTomaDeHoy, textoDeCobertura } from './tomaDeHoy';

const base = (extra: Partial<TomaDelDia> = {}): TomaDelDia => ({
  tomaId: 'toma-c1-0-202610070800',
  consultaId: 'c1',
  toma: { tomaId: 'toma-c1-0-202610070800', indice: 0, programadaPara: new Date(2026, 9, 7, 8, 0), medicamento: 'Losartán', dosis: '1 tableta' },
  estado: 'pendiente',
  ...extra,
});

describe('aTomaDeHoy (lo que dibuja la tarjeta)', () => {
  it('el título lleva nombre y dosis; sin dosis, solo el nombre', () => {
    expect(aTomaDeHoy(base()).titulo).toBe('Losartán · 1 tableta');
    expect(aTomaDeHoy(base({ toma: { ...base().toma, dosis: undefined } })).titulo).toBe('Losartán');
  });

  it('la hora no lleva cero inicial y la medianoche es 0:00', () => {
    expect(aTomaDeHoy(base()).hora).toBe('8:00');
    expect(aTomaDeHoy(base({ toma: { ...base().toma, programadaPara: new Date(2026, 9, 7, 0, 0) } })).hora).toBe('0:00');
    expect(aTomaDeHoy(base({ toma: { ...base().toma, programadaPara: new Date(2026, 9, 7, 21, 5) } })).hora).toBe('21:05');
  });

  it('una tomada trae la hora real; las demás no', () => {
    expect(aTomaDeHoy(base({ estado: 'tomada', tomadaEn: new Date(2026, 9, 7, 8, 2) }))).toMatchObject({ estado: 'tomada', tomadaA: '8:02' });
    expect(aTomaDeHoy(base()).tomadaA).toBeUndefined();
  });

  it('el id es el de la toma', () => {
    expect(aTomaDeHoy(base()).id).toBe('toma-c1-0-202610070800');
  });
});

describe('textoDeCobertura (F074: nunca prometer más de lo programado)', () => {
  it('con la cobertura completa no se dice nada', () => {
    expect(textoDeCobertura({ pendientes: 6, conAviso: 6, completa: true, hasta: null })).toBeNull();
  });

  it('si no cabe todo, dice hasta qué día llegan los avisos y que hay que abrir la app para renovarlos', () => {
    expect(textoDeCobertura({ pendientes: 40, conAviso: 20, completa: false, hasta: new Date(2026, 9, 15, 8, 0) })).toBe(
      'Tus avisos llegan hasta el jueves 15 de octubre. Abre MediQ antes para renovarlos.',
    );
  });

  it('sin cobertura no hay texto', () => {
    expect(textoDeCobertura(null)).toBeNull();
  });
});

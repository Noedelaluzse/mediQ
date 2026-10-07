import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { conTiempoLimite, ErrorDeRed, esErrorDeRed } from './red';

describe('esErrorDeRed (¿falló por falta de internet, no por los datos?)', () => {
  it('reconoce los códigos de Firestore de «sin conexión» y «tiempo agotado»', () => {
    expect(esErrorDeRed({ code: 'unavailable', message: 'x' })).toBe(true);
    expect(esErrorDeRed({ code: 'deadline-exceeded', message: 'x' })).toBe(true);
  });

  it('reconoce los mensajes típicos de red', () => {
    expect(esErrorDeRed(new Error('Failed to get document because the client is offline.'))).toBe(true);
    expect(esErrorDeRed(new TypeError('Network request failed'))).toBe(true);
    expect(esErrorDeRed(new Error('timeout'))).toBe(true);
  });

  it('un ErrorDeRed propio lo es', () => {
    expect(esErrorDeRed(new ErrorDeRed())).toBe(true);
  });

  it('un rechazo de las reglas o un dato inválido NO es de red (reintentar no lo arregla)', () => {
    expect(esErrorDeRed({ code: 'permission-denied', message: 'Missing or insufficient permissions.' })).toBe(false);
    expect(esErrorDeRed({ code: 'invalid-argument', message: 'x' })).toBe(false);
    expect(esErrorDeRed(new Error('La fecha no puede ser futura'))).toBe(false);
  });

  it('cualquier otra cosa no es de red', () => {
    expect(esErrorDeRed(undefined)).toBe(false);
    expect(esErrorDeRed('texto')).toBe(false);
    expect(esErrorDeRed(null)).toBe(false);
  });

  it('encuentra la causa de red dentro de otro error', () => {
    expect(esErrorDeRed(new Error('no se pudo', { cause: { code: 'unavailable' } }))).toBe(true);
  });
});

describe('conTiempoLimite', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve el resultado si llega a tiempo', async () => {
    await expect(conTiempoLimite(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it('si la operación nunca termina (Firestore sin red no rechaza, espera), falla con ErrorDeRed al agotarse el tiempo', async () => {
    const colgada = new Promise<number>(() => undefined);
    const resultado = conTiempoLimite(colgada, 5000);
    const esperado = expect(resultado).rejects.toBeInstanceOf(ErrorDeRed);
    await vi.advanceTimersByTimeAsync(5001);
    await esperado;
  });

  it('si la operación falla antes, propaga ese error (no lo disfraza)', async () => {
    const falla = new Error('boom');
    await expect(conTiempoLimite(Promise.reject(falla), 1000)).rejects.toBe(falla);
  });

  it('no deja un temporizador vivo cuando termina a tiempo', async () => {
    await conTiempoLimite(Promise.resolve(1), 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

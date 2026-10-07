import { describe, expect, it } from 'vitest';

import { hayInternet } from './estadoDeRed';

describe('hayInternet (qué cuenta como «conectado»)', () => {
  it('conectado y con internet alcanzable', () => {
    expect(hayInternet({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('conectado a una red pero sin internet alcanzable (Wi-Fi sin salida) no cuenta', () => {
    expect(hayInternet({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('si todavía no se sabe si hay salida a internet (null), se intenta: cuenta como conectado', () => {
    expect(hayInternet({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(hayInternet({ isConnected: true })).toBe(true);
  });

  it('sin red no hay internet', () => {
    expect(hayInternet({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(hayInternet({ isConnected: false, isInternetReachable: null })).toBe(false);
  });

  it('si no se sabe si hay red (null), no cuenta', () => {
    expect(hayInternet({ isConnected: null, isInternetReachable: null })).toBe(false);
  });
});

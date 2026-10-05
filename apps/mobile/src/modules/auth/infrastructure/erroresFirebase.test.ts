import { describe, expect, it } from 'vitest';

import { esReautenticacionRequerida } from './erroresFirebase';

describe('esReautenticacionRequerida', () => {
  it('reconoce el error de Firebase Auth que pide un inicio de sesión reciente', () => {
    expect(esReautenticacionRequerida({ code: 'auth/requires-recent-login' })).toBe(true);
  });

  it('no confunde otros errores', () => {
    expect(esReautenticacionRequerida({ code: 'auth/network-request-failed' })).toBe(false);
    expect(esReautenticacionRequerida(new Error('x'))).toBe(false);
    expect(esReautenticacionRequerida(null)).toBe(false);
    expect(esReautenticacionRequerida('auth/requires-recent-login')).toBe(false);
  });
});

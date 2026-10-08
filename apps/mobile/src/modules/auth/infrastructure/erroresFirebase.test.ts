import { describe, expect, it } from 'vitest';

import { CredencialRechazadaError, SinConexionError } from '../domain/errors';
import { errorAlEntrarConGoogle, esReautenticacionRequerida } from './erroresFirebase';

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

describe('errorAlEntrarConGoogle (F052)', () => {
  it('un fallo de red NO es «credencial rechazada»: la sesión guardada sigue siendo válida', () => {
    expect(errorAlEntrarConGoogle({ code: 'auth/network-request-failed', message: 'x' })).toBeInstanceOf(SinConexionError);
    expect(errorAlEntrarConGoogle(new TypeError('Network request failed'))).toBeInstanceOf(SinConexionError);
  });

  it('cualquier otro fallo sí es una credencial rechazada', () => {
    expect(errorAlEntrarConGoogle({ code: 'auth/invalid-credential', message: 'x' })).toBeInstanceOf(CredencialRechazadaError);
    expect(errorAlEntrarConGoogle(new Error('x'))).toBeInstanceOf(CredencialRechazadaError);
  });
});

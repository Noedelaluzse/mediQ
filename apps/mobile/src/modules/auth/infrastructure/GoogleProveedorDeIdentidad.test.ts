import { describe, expect, it } from 'vitest';

import { LoginCanceladoError, ProveedorNoDisponibleError, SesionNoRestauradaError } from '../domain/errors';
import { GoogleProveedorDeIdentidad, type ClienteGoogle } from './GoogleProveedorDeIdentidad';

const conRespuesta = (r: Awaited<ReturnType<ClienteGoogle['signIn']>>): ClienteGoogle => ({
  signIn: async () => r,
  signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
});

describe('GoogleProveedorDeIdentidad', () => {
  it('devuelve el idToken cuando Google responde con éxito', async () => {
    const r = await new GoogleProveedorDeIdentidad(
      conRespuesta({ type: 'success', data: { idToken: 'tok' } }),
    ).obtenerIdToken();
    expect(r).toEqual({ ok: true, value: 'tok' });
  });

  it('si el usuario cancela devuelve LoginCanceladoError', async () => {
    const r = await new GoogleProveedorDeIdentidad(conRespuesta({ type: 'cancelled' })).obtenerIdToken();
    expect(!r.ok && r.error).toBeInstanceOf(LoginCanceladoError);
  });

  it('si Google no entrega idToken devuelve ProveedorNoDisponibleError', async () => {
    const r = await new GoogleProveedorDeIdentidad(
      conRespuesta({ type: 'success', data: { idToken: null } }),
    ).obtenerIdToken();
    expect(!r.ok && r.error).toBeInstanceOf(ProveedorNoDisponibleError);
  });

  it('si el cliente lanza un error devuelve ProveedorNoDisponibleError', async () => {
    const cliente: ClienteGoogle = {
      signIn: async () => {
        throw new Error('boom');
      },
      signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
    };
    const r = await new GoogleProveedorDeIdentidad(cliente).obtenerIdToken();
    expect(!r.ok && r.error).toBeInstanceOf(ProveedorNoDisponibleError);
  });

  describe('obtenerIdTokenSilencioso', () => {
    const con = (silencioso: ClienteGoogle['signInSilently']): ClienteGoogle => ({
      signIn: async () => ({ type: 'cancelled' }),
      signInSilently: silencioso,
    });

    it('devuelve el idToken si Google recuerda al usuario', async () => {
      const r = await new GoogleProveedorDeIdentidad(
        con(async () => ({ type: 'success', data: { idToken: 'nuevo' } })),
      ).obtenerIdTokenSilencioso();
      expect(r).toEqual({ ok: true, value: 'nuevo' });
    });

    it('si no hay credencial guardada devuelve SesionNoRestauradaError', async () => {
      const r = await new GoogleProveedorDeIdentidad(
        con(async () => ({ type: 'noSavedCredentialFound' })),
      ).obtenerIdTokenSilencioso();
      expect(!r.ok && r.error).toBeInstanceOf(SesionNoRestauradaError);
    });

    it('si el SDK falla devuelve ProveedorNoDisponibleError', async () => {
      const r = await new GoogleProveedorDeIdentidad(
        con(async () => {
          throw new Error('boom');
        }),
      ).obtenerIdTokenSilencioso();
      expect(!r.ok && r.error).toBeInstanceOf(ProveedorNoDisponibleError);
    });
  });
});

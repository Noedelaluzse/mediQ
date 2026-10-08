import { describe, expect, it } from 'vitest';

import { LoginCanceladoError, ProveedorNoDisponibleError, SesionNoRestauradaError, SinConexionError } from '../domain/errors';
import { GoogleProveedorDeIdentidad, type ClienteGoogle } from './GoogleProveedorDeIdentidad';

const conRespuesta = (r: Awaited<ReturnType<ClienteGoogle['signIn']>>): ClienteGoogle => ({
  signIn: async () => r,
  signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
  signOut: async () => undefined,
  revokeAccess: async () => undefined,
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
      signOut: async () => undefined,
      revokeAccess: async () => undefined,
    };
    const r = await new GoogleProveedorDeIdentidad(cliente).obtenerIdToken();
    expect(!r.ok && r.error).toBeInstanceOf(ProveedorNoDisponibleError);
  });

  describe('obtenerIdTokenSilencioso', () => {
    const con = (silencioso: ClienteGoogle['signInSilently']): ClienteGoogle => ({
      signIn: async () => ({ type: 'cancelled' }),
      signInSilently: silencioso,
      signOut: async () => undefined,
      revokeAccess: async () => undefined,
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

    it('si falla por falta de internet devuelve SinConexionError (F052: la sesión guardada sigue siendo válida)', async () => {
      const r = await new GoogleProveedorDeIdentidad(
        con(async () => {
          throw new Error('The Internet connection appears to be offline.');
        }),
      ).obtenerIdTokenSilencioso();
      expect(!r.ok && r.error).toBeInstanceOf(SinConexionError);
    });
  });

  describe('cerrarSesion', () => {
    it('cierra la sesión de Google en el dispositivo', async () => {
      let cerrada = false;
      const cliente: ClienteGoogle = {
        signIn: async () => ({ type: 'cancelled' }),
        signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
        signOut: async () => {
          cerrada = true;
        },
        revokeAccess: async () => undefined,
      };
      await new GoogleProveedorDeIdentidad(cliente).cerrarSesion();
      expect(cerrada).toBe(true);
    });

    it('si el SDK falla no lanza (cerrar sesión no debe quedarse a medias)', async () => {
      const cliente: ClienteGoogle = {
        signIn: async () => ({ type: 'cancelled' }),
        signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
        signOut: async () => {
          throw new Error('boom');
        },
        revokeAccess: async () => undefined,
      };
      await expect(new GoogleProveedorDeIdentidad(cliente).cerrarSesion()).resolves.toBeUndefined();
    });
  });

  describe('revocarAcceso', () => {
    const con = (revoke: ClienteGoogle['revokeAccess']): ClienteGoogle => ({
      signIn: async () => ({ type: 'cancelled' }),
      signInSilently: async () => ({ type: 'noSavedCredentialFound' }),
      signOut: async () => undefined,
      revokeAccess: revoke,
    });

    it('desvincula la app de la cuenta de Google', async () => {
      let revocado = false;
      await new GoogleProveedorDeIdentidad(
        con(async () => {
          revocado = true;
        }),
      ).revocarAcceso();
      expect(revocado).toBe(true);
    });

    it('si el SDK falla no lanza', async () => {
      await expect(
        new GoogleProveedorDeIdentidad(
          con(async () => {
            throw new Error('boom');
          }),
        ).revocarAcceso(),
      ).resolves.toBeUndefined();
    });
  });
});

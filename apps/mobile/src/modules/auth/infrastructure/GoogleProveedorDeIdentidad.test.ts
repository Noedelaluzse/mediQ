import { describe, expect, it } from 'vitest';

import { LoginCanceladoError, ProveedorNoDisponibleError } from '../domain/errors';
import { GoogleProveedorDeIdentidad, type ClienteGoogle } from './GoogleProveedorDeIdentidad';

const conRespuesta = (r: Awaited<ReturnType<ClienteGoogle['signIn']>>): ClienteGoogle => ({ signIn: async () => r });

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
    };
    const r = await new GoogleProveedorDeIdentidad(cliente).obtenerIdToken();
    expect(!r.ok && r.error).toBeInstanceOf(ProveedorNoDisponibleError);
  });
});

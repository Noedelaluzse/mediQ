import { describe, expect, it } from 'vitest';

import { err, ok } from '@/shared/kernel/Result';

import { crearSesion, type Sesion } from '../domain/Sesion';
import { LoginCanceladoError, ServidorNoDisponibleError } from '../domain/errors';
import type { AuthRepository } from '../domain/AuthRepository';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { SesionStore } from '../domain/SesionStore';
import { AceptarAvisoDePrivacidad } from './AceptarAvisoDePrivacidad';
import { IniciarSesionConGoogle } from './IniciarSesionConGoogle';
import { ObtenerSesionActual } from './ObtenerSesionActual';

const sesionDe = (primeraVez: boolean): Sesion => {
  const r = crearSesion({
    accessToken: 'acc',
    refreshToken: 'ref',
    usuario: { id: 'u1', nombre: 'Ana', email: 'ana@mail.com' },
    primeraVez,
  });
  if (!r.ok) throw r.error;
  return r.value;
};

class StoreEnMemoria implements SesionStore {
  guardada: Sesion | null = null;
  async guardar(s: Sesion) {
    this.guardada = s;
  }
  async leer() {
    return this.guardada;
  }
  async borrar() {
    this.guardada = null;
  }
}

const proveedor = (resultado: Awaited<ReturnType<ProveedorDeIdentidad['obtenerIdToken']>>): ProveedorDeIdentidad => ({
  obtenerIdToken: async () => resultado,
});

const auth = (resultado: Awaited<ReturnType<AuthRepository['autenticarConGoogle']>>): AuthRepository => ({
  autenticarConGoogle: async () => resultado,
});

describe('IniciarSesionConGoogle', () => {
  it('abre Google, autentica con la API y guarda la sesión', async () => {
    const store = new StoreEnMemoria();
    const caso = new IniciarSesionConGoogle(proveedor(ok('idToken')), auth(ok(sesionDe(true))), store);

    const r = await caso.ejecutar();

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.primeraVez).toBe(true);
    expect(store.guardada?.accessToken).toBe('acc');
  });

  it('envía a la API el idToken que entregó Google', async () => {
    let recibido = '';
    const repo: AuthRepository = {
      autenticarConGoogle: async (idToken) => {
        recibido = idToken;
        return ok(sesionDe(false));
      },
    };
    await new IniciarSesionConGoogle(proveedor(ok('token-de-google')), repo, new StoreEnMemoria()).ejecutar();
    expect(recibido).toBe('token-de-google');
  });

  it('si el usuario cancela, no guarda nada', async () => {
    const store = new StoreEnMemoria();
    const r = await new IniciarSesionConGoogle(
      proveedor(err(new LoginCanceladoError())),
      auth(ok(sesionDe(false))),
      store,
    ).ejecutar();

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(LoginCanceladoError);
    expect(store.guardada).toBeNull();
  });

  it('si la API falla, no guarda nada', async () => {
    const store = new StoreEnMemoria();
    const r = await new IniciarSesionConGoogle(
      proveedor(ok('t')),
      auth(err(new ServidorNoDisponibleError())),
      store,
    ).ejecutar();

    expect(r.ok).toBe(false);
    expect(store.guardada).toBeNull();
  });
});

describe('ObtenerSesionActual', () => {
  it('devuelve la sesión guardada', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(false));
    expect((await new ObtenerSesionActual(store).ejecutar())?.usuario.id).toBe('u1');
  });

  it('devuelve null sin sesión', async () => {
    expect(await new ObtenerSesionActual(new StoreEnMemoria()).ejecutar()).toBeNull();
  });
});

describe('AceptarAvisoDePrivacidad', () => {
  it('marca la sesión como ya no primera vez', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(true));

    const actualizada = await new AceptarAvisoDePrivacidad(store).ejecutar();

    expect(actualizada?.primeraVez).toBe(false);
    expect(store.guardada?.primeraVez).toBe(false);
  });

  it('sin sesión no hace nada', async () => {
    expect(await new AceptarAvisoDePrivacidad(new StoreEnMemoria()).ejecutar()).toBeNull();
  });
});

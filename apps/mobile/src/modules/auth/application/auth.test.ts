import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import { err, ok } from '@/shared/kernel/Result';

import { crearSesion, type Sesion } from '../domain/Sesion';
import { CredencialRechazadaError, LoginCanceladoError, ServidorNoDisponibleError, SesionNoRestauradaError, SinConexionError } from '../domain/errors';
import { VERSIONES_VIGENTES, type Consentimiento } from '../domain/Consentimiento';
import type { ConsentimientosRepository } from '../domain/ConsentimientosRepository';
import type { AuthRepository } from '../domain/AuthRepository';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { SesionStore } from '../domain/SesionStore';
import { AceptarAvisoDePrivacidad } from './AceptarAvisoDePrivacidad';
import { IniciarSesionConGoogle } from './IniciarSesionConGoogle';
import { ConsultarConsentimientosPendientes } from './ConsultarConsentimientosPendientes';
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

const proveedor = (
  resultado: Awaited<ReturnType<ProveedorDeIdentidad['obtenerIdToken']>>,
  silencioso: Awaited<ReturnType<ProveedorDeIdentidad['obtenerIdTokenSilencioso']>> = ok('token-silencioso'),
): ProveedorDeIdentidad => ({
  obtenerIdToken: async () => resultado,
  obtenerIdTokenSilencioso: async () => silencioso,
  cerrarSesion: async () => undefined,
  revocarAcceso: async () => undefined,
});

class ConsentimientosEnMemoria implements ConsentimientosRepository {
  porUsuario = new Map<string, Consentimiento[]>();
  registros = 0;
  falla = false;
  async listar(usuarioId: string) {
    return this.porUsuario.get(usuarioId) ?? [];
  }
  async registrar(usuarioId: string, c: Consentimiento) {
    if (this.falla) throw new Error('permission-denied');
    this.registros += 1;
    this.porUsuario.set(usuarioId, [...(this.porUsuario.get(usuarioId) ?? []), c]);
  }
}

const auth = (resultado: Awaited<ReturnType<AuthRepository['autenticarConGoogle']>>): AuthRepository => ({
  autenticarConGoogle: async () => resultado,
  cerrarSesion: async () => undefined,
  eliminarUsuario: async () => ok(undefined),
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
      cerrarSesion: async () => undefined,
      eliminarUsuario: async () => ok(undefined),
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

const red = (conectado: boolean): Conectividad => ({ estaConectado: async () => conectado, suscribir: () => () => undefined });
const restaurar = (store: SesionStore, identidad: ProveedorDeIdentidad, repo: AuthRepository, conectado = true) =>
  new ObtenerSesionActual(store, identidad, repo, red(conectado)).ejecutar();

describe('ObtenerSesionActual (restaura la sesión al abrir la app)', () => {
  it('con sesión guardada e internet renueva la autenticación remota y la deja verificada', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(false));
    let tokenRecibido = '';
    const repo: AuthRepository = {
      autenticarConGoogle: async (t) => {
        tokenRecibido = t;
        return ok({ ...sesionDe(false), accessToken: 'nuevo' });
      },
      cerrarSesion: async () => undefined,
      eliminarUsuario: async () => ok(undefined),
    };

    const r = await restaurar(store, proveedor(ok('x')), repo);

    expect(r.sesion?.accessToken).toBe('nuevo');
    expect(r.sinVerificar).toBe(false);
    expect(store.guardada?.accessToken).toBe('nuevo');
    expect(tokenRecibido).toBe('token-silencioso');
  });

  it('sin sesión guardada devuelve null y no toca a Google', async () => {
    let llamadas = 0;
    const identidad: ProveedorDeIdentidad = {
      obtenerIdToken: async () => ok('x'),
      obtenerIdTokenSilencioso: async () => {
        llamadas += 1;
        return ok('x');
      },
      cerrarSesion: async () => undefined,
      revocarAcceso: async () => undefined,
    };
    const r = await restaurar(new StoreEnMemoria(), identidad, auth(ok(sesionDe(false))));
    expect(r).toEqual({ sesion: null, sinVerificar: false });
    expect(llamadas).toBe(0);
  });

  it('si Google ya no recuerda al usuario devuelve null (debe iniciar sesión de nuevo)', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(false));
    const r = await restaurar(store, proveedor(ok('x'), err(new SesionNoRestauradaError())), auth(ok(sesionDe(false))));
    expect(r.sesion).toBeNull();
  });

  it('si Firebase rechaza la credencial de verdad devuelve null (debe iniciar sesión de nuevo)', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(false));
    const r = await restaurar(store, proveedor(ok('x')), auth(err(new CredencialRechazadaError())));
    expect(r.sesion).toBeNull();
  });

  it('si el servidor falla por una razón que no es la red (p. ej. permisos) devuelve null', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(false));
    const r = await restaurar(store, proveedor(ok('x')), auth(err(new ServidorNoDisponibleError())));
    expect(r.sesion).toBeNull();
  });

  describe('sin internet (F052): la sesión guardada sigue valiendo, solo no se puede verificar', () => {
    it('al abrir sin internet entra con la sesión guardada, sin verificar y sin llamar a Google ni a Firebase', async () => {
      const store = new StoreEnMemoria();
      const guardada = sesionDe(false);
      await store.guardar(guardada);
      let llamadas = 0;
      const identidad = { ...proveedor(ok('x')), obtenerIdTokenSilencioso: async () => (llamadas++, ok('x')) } as ProveedorDeIdentidad;
      const repo: AuthRepository = { ...auth(ok(sesionDe(false))), autenticarConGoogle: async () => (llamadas++, ok(sesionDe(false))) };

      const r = await restaurar(store, identidad, repo, false);

      expect(r).toEqual({ sesion: guardada, sinVerificar: true });
      expect(llamadas).toBe(0);
    });

    it('sin internet y sin sesión guardada pide iniciar sesión (no hay nada que restaurar)', async () => {
      expect((await restaurar(new StoreEnMemoria(), proveedor(ok('x')), auth(ok(sesionDe(false))), false)).sesion).toBeNull();
    });

    it('si Google falla por la red aunque el teléfono diga que hay internet, entra sin verificar', async () => {
      const store = new StoreEnMemoria();
      const guardada = sesionDe(false);
      await store.guardar(guardada);
      const r = await restaurar(store, proveedor(ok('x'), err(new SinConexionError())), auth(ok(sesionDe(false))));
      expect(r).toEqual({ sesion: guardada, sinVerificar: true });
    });

    it('si Firebase falla por la red aunque el teléfono diga que hay internet, entra sin verificar', async () => {
      const store = new StoreEnMemoria();
      const guardada = sesionDe(false);
      await store.guardar(guardada);
      const r = await restaurar(store, proveedor(ok('x')), auth(err(new SinConexionError())));
      expect(r).toEqual({ sesion: guardada, sinVerificar: true });
    });

    it('entrar sin verificar no cambia lo guardado (no se pisa la sesión con algo sin comprobar)', async () => {
      const store = new StoreEnMemoria();
      const guardada = sesionDe(false);
      await store.guardar(guardada);
      await restaurar(store, proveedor(ok('x')), auth(ok(sesionDe(false))), false);
      expect(store.guardada).toBe(guardada);
    });
  });
});

describe('ConsultarConsentimientosPendientes', () => {
  it('devuelve los documentos sin aceptar en su versión vigente', async () => {
    const repo = new ConsentimientosEnMemoria();
    expect(await new ConsultarConsentimientosPendientes(repo).ejecutar('u1')).toEqual(['aviso_privacidad', 'terminos']);
  });
});

describe('AceptarAvisoDePrivacidad (RF-03)', () => {
  const ahora = () => new Date('2026-10-05T18:00:00Z');

  it('registra los documentos pendientes con la versión vigente y la fecha', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(true));
    const consentimientos = new ConsentimientosEnMemoria();

    await new AceptarAvisoDePrivacidad(store, consentimientos, ahora).ejecutar();

    expect(consentimientos.porUsuario.get('u1')).toEqual([
      { documento: 'aviso_privacidad', version: VERSIONES_VIGENTES.aviso_privacidad, aceptadoEn: ahora() },
      { documento: 'terminos', version: VERSIONES_VIGENTES.terminos, aceptadoEn: ahora() },
    ]);
  });

  it('marca la sesión como ya no primera vez', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(true));

    const actualizada = await new AceptarAvisoDePrivacidad(store, new ConsentimientosEnMemoria(), ahora).ejecutar();

    expect(actualizada?.primeraVez).toBe(false);
    expect(store.guardada?.primeraVez).toBe(false);
  });

  it('no vuelve a registrar lo que ya está aceptado', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(true));
    const consentimientos = new ConsentimientosEnMemoria();
    const caso = new AceptarAvisoDePrivacidad(store, consentimientos, ahora);

    await caso.ejecutar();
    await caso.ejecutar();

    expect(consentimientos.registros).toBe(2);
  });

  it('si no se puede registrar, propaga el error y deja la sesión como estaba', async () => {
    const store = new StoreEnMemoria();
    await store.guardar(sesionDe(true));
    const consentimientos = new ConsentimientosEnMemoria();
    consentimientos.falla = true;

    await expect(new AceptarAvisoDePrivacidad(store, consentimientos, ahora).ejecutar()).rejects.toThrow();
    expect(store.guardada?.primeraVez).toBe(true);
  });

  it('sin sesión no hace nada', async () => {
    const consentimientos = new ConsentimientosEnMemoria();
    expect(await new AceptarAvisoDePrivacidad(new StoreEnMemoria(), consentimientos, ahora).ejecutar()).toBeNull();
    expect(consentimientos.registros).toBe(0);
  });
});

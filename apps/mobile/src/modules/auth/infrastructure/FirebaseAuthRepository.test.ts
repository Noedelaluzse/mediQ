import { describe, expect, it } from 'vitest';

import { err, ok } from '@/shared/kernel/Result';

import { RegistrarCuenta } from '../application/RegistrarCuenta';
import type { Cuenta } from '../domain/Cuenta';
import type { CuentasRepository } from '../domain/CuentasRepository';
import { CredencialRechazadaError, ReautenticacionRequeridaError, ServidorNoDisponibleError, SinConexionError } from '../domain/errors';
import { FirebaseAuthRepository, type ServicioDeIdentidadFirebase } from './FirebaseAuthRepository';

const identidad = { uid: 'u1', googleSub: 'g-1', email: 'ana@mail.com', nombre: 'Ana', accessToken: 'acc', refreshToken: 'ref' };

const servicioOk: ServicioDeIdentidadFirebase = {
  iniciarSesionConGoogle: async () => ok(identidad),
  cerrarSesion: async () => undefined,
  eliminarUsuario: async () => ok(undefined),
};

const repoEnMemoria = (): CuentasRepository & { cuentas: Map<string, Cuenta> } => {
  const cuentas = new Map<string, Cuenta>();
  return {
    cuentas,
    buscar: async (id) => cuentas.get(id) ?? null,
    crear: async (c) => void cuentas.set(c.usuarioId, c),
  };
};

describe('FirebaseAuthRepository', () => {
  it('la primera vez entrega una sesión con primeraVez y crea la cuenta', async () => {
    const repo = repoEnMemoria();
    const r = await new FirebaseAuthRepository(servicioOk, new RegistrarCuenta(repo)).autenticarConGoogle('idToken');

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.primeraVez).toBe(true);
      expect(r.value.usuario).toEqual({ id: 'u1', nombre: 'Ana', email: 'ana@mail.com' });
      expect(r.value.accessToken).toBe('acc');
      expect(r.value.refreshToken).toBe('ref');
    }
    expect(repo.cuentas.has('u1')).toBe(true);
  });

  it('con una cuenta existente primeraVez es falso', async () => {
    const repo = repoEnMemoria();
    const auth = new FirebaseAuthRepository(servicioOk, new RegistrarCuenta(repo));
    await auth.autenticarConGoogle('t');
    const r = await auth.autenticarConGoogle('t');
    expect(r.ok && r.value.primeraVez).toBe(false);
  });

  it('si Firebase rechaza la credencial devuelve CredencialRechazadaError y no crea nada', async () => {
    const repo = repoEnMemoria();
    const servicio: ServicioDeIdentidadFirebase = {
      iniciarSesionConGoogle: async () => err(new CredencialRechazadaError()),
      cerrarSesion: async () => undefined,
      eliminarUsuario: async () => ok(undefined),
    };
    const r = await new FirebaseAuthRepository(servicio, new RegistrarCuenta(repo)).autenticarConGoogle('t');

    expect(!r.ok && r.error).toBeInstanceOf(CredencialRechazadaError);
    expect(repo.cuentas.size).toBe(0);
  });

  it('si la base de datos falla devuelve ServidorNoDisponibleError', async () => {
    const roto: CuentasRepository = {
      buscar: async () => {
        throw new Error('permission-denied');
      },
      crear: async () => undefined,
    };
    const r = await new FirebaseAuthRepository(servicioOk, new RegistrarCuenta(roto)).autenticarConGoogle('t');
    expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
  });

  it('cerrarSesion cierra la sesión en Firebase Auth', async () => {
    let cerrada = false;
    const servicio: ServicioDeIdentidadFirebase = {
      iniciarSesionConGoogle: async () => ok(identidad),
      cerrarSesion: async () => {
        cerrada = true;
      },
      eliminarUsuario: async () => ok(undefined),
    };
    await new FirebaseAuthRepository(servicio, new RegistrarCuenta(repoEnMemoria())).cerrarSesion();
    expect(cerrada).toBe(true);
  });

  it('eliminarUsuario delega en Firebase Auth y devuelve su resultado', async () => {
    const servicio: ServicioDeIdentidadFirebase = {
      iniciarSesionConGoogle: async () => ok(identidad),
      cerrarSesion: async () => undefined,
      eliminarUsuario: async () => err(new ReautenticacionRequeridaError()),
    };
    const r = await new FirebaseAuthRepository(servicio, new RegistrarCuenta(repoEnMemoria())).eliminarUsuario();
    expect(!r.ok && r.error).toBeInstanceOf(ReautenticacionRequeridaError);
  });

  describe('sin internet (F052)', () => {
    it('si Firebase no responde por falta de internet devuelve SinConexionError, no «credencial rechazada»', async () => {
      const servicio: ServicioDeIdentidadFirebase = { ...servicioOk, iniciarSesionConGoogle: async () => err(new SinConexionError()) };
      const r = await new FirebaseAuthRepository(servicio, new RegistrarCuenta(repoEnMemoria())).autenticarConGoogle('t');
      expect(!r.ok && r.error).toBeInstanceOf(SinConexionError);
    });

    it('si registrar la cuenta falla por la red devuelve SinConexionError (que además es un «servidor no disponible»)', async () => {
      const cuentas: CuentasRepository = { buscar: async () => Promise.reject({ code: 'unavailable', message: 'x' }), crear: async () => undefined };
      const r = await new FirebaseAuthRepository(servicioOk, new RegistrarCuenta(cuentas)).autenticarConGoogle('t');
      expect(!r.ok && r.error).toBeInstanceOf(SinConexionError);
      expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
    });

    it('si registrar la cuenta falla por otra razón (p. ej. permisos) sigue siendo «servidor no disponible», NO sin conexión', async () => {
      const cuentas: CuentasRepository = { buscar: async () => Promise.reject({ code: 'permission-denied', message: 'x' }), crear: async () => undefined };
      const r = await new FirebaseAuthRepository(servicioOk, new RegistrarCuenta(cuentas)).autenticarConGoogle('t');
      expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
      expect(!r.ok && r.error).not.toBeInstanceOf(SinConexionError);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { err, ok, type Result } from '@/shared/kernel/Result';

import { ReautenticacionRequeridaError, ServidorNoDisponibleError, SesionNoRestauradaError } from '../domain/errors';
import { crearSesion, type Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';
import { EliminarCuenta } from './EliminarCuenta';

const sesion = (id = 'u1'): Sesion => {
  const r = crearSesion({
    accessToken: 'a',
    refreshToken: 'r',
    usuario: { id, nombre: 'Ana', email: 'ana@mail.com' },
    primeraVez: false,
  });
  if (!r.ok) throw r.error;
  return r.value;
};

type Resultado = Result<void, ReautenticacionRequeridaError | ServidorNoDisponibleError>;

type Opciones = {
  sinSesion?: boolean;
  datosFalla?: boolean;
  /** Resultados sucesivos de eliminar el usuario de Auth (el último se repite). */
  eliminaciones?: Resultado[];
  silencioso?: 'ok' | 'falla';
  googleLanza?: boolean;
  /** Uid con el que Firebase reautentica (por defecto el mismo que la sesión guardada). */
  uidReautenticado?: string;
};

const montar = (o: Opciones = {}) => {
  const pasos: string[] = [];
  let guardada: Sesion | null = o.sinSesion ? null : sesion();
  const store: SesionStore = {
    guardar: async (s) => void (guardada = s),
    leer: async () => guardada,
    borrar: async () => {
      pasos.push('borrar-sesion-local');
      guardada = null;
    },
  };
  const datos = {
    eliminarTodo: async (usuarioId: string) => {
      pasos.push(`eliminar-datos:${usuarioId}`);
      if (o.datosFalla) throw new Error('permission-denied');
    },
  };
  const eliminaciones = o.eliminaciones ?? [ok(undefined)];
  let n = 0;
  const auth = {
    autenticarConGoogle: async () => {
      pasos.push('reautenticar');
      return ok(sesion(o.uidReautenticado));
    },
    cerrarSesion: async () => undefined,
    eliminarUsuario: async (): Promise<Resultado> => {
      pasos.push('eliminar-usuario-auth');
      return eliminaciones[Math.min(n++, eliminaciones.length - 1)];
    },
  };
  const identidad = {
    obtenerIdToken: async () => ok('t'),
    obtenerIdTokenSilencioso: async () => (o.silencioso === 'falla' ? err(new SesionNoRestauradaError()) : ok('t')),
    cerrarSesion: async () => {
      pasos.push('cerrar-google');
      if (o.googleLanza) throw new Error('google');
    },
    revocarAcceso: async () => {
      pasos.push('revocar-google');
      if (o.googleLanza) throw new Error('google');
    },
  };
  return { pasos, caso: new EliminarCuenta(store, datos, auth, identidad), sesionGuardada: () => guardada };
};

describe('EliminarCuenta (RF-05)', () => {
  it('reautentica, borra los datos, borra el usuario de Auth, desvincula Google y borra la sesión local, en ese orden', async () => {
    const { caso, pasos } = montar();
    const r = await caso.ejecutar();
    expect(r.ok).toBe(true);
    expect(pasos).toEqual([
      'reautenticar',
      'eliminar-datos:u1',
      'eliminar-usuario-auth',
      'revocar-google',
      'cerrar-google',
      'borrar-sesion-local',
    ]);
  });

  it('reautentica ANTES de borrar los datos: después, el registro de cuenta volvería a crearla', async () => {
    const { caso, pasos } = montar();
    await caso.ejecutar();
    expect(pasos.indexOf('reautenticar')).toBeLessThan(pasos.indexOf('eliminar-datos:u1'));
  });

  it('sin sesión no hace nada y falla', async () => {
    const { caso, pasos } = montar({ sinSesion: true });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(SesionNoRestauradaError);
    expect(pasos).toEqual([]);
  });

  it('si no se puede reautenticar, no borra nada y conserva la sesión', async () => {
    const { caso, pasos, sesionGuardada } = montar({ silencioso: 'falla' });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(SesionNoRestauradaError);
    expect(pasos).toEqual([]);
    expect(sesionGuardada()).not.toBeNull();
  });

  it('si Firebase reautentica con otro uid que la sesión guardada, no borra nada y conserva la sesión (F043)', async () => {
    const { caso, pasos, sesionGuardada } = montar({ uidReautenticado: 'u2' });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(SesionNoRestauradaError);
    expect(pasos).toEqual(['reautenticar']);
    expect(sesionGuardada()).not.toBeNull();
  });

  it('borra los datos del uid con el que Firebase acaba de reautenticar (F043)', async () => {
    const { caso, pasos } = montar({ uidReautenticado: 'u1' });
    await caso.ejecutar();
    expect(pasos).toContain('eliminar-datos:u1');
  });

  it('si falla el borrado de datos no toca nada más y conserva la sesión (se puede reintentar)', async () => {
    const { caso, pasos, sesionGuardada } = montar({ datosFalla: true });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
    expect(pasos).toEqual(['reautenticar', 'eliminar-datos:u1']);
    expect(sesionGuardada()).not.toBeNull();
  });

  it('el error conserva la causa original para poder diagnosticar qué falló', async () => {
    const { caso } = montar({ datosFalla: true });
    const r = await caso.ejecutar();
    const causa = !r.ok ? (r.error.cause as Error | undefined) : undefined;
    expect(causa?.message).toBe('permission-denied');
  });

  it('si Auth aún pide un inicio de sesión reciente, falla sin reintentar en bucle y conserva la sesión', async () => {
    const { caso, pasos, sesionGuardada } = montar({ eliminaciones: [err(new ReautenticacionRequeridaError())] });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
    expect(pasos.filter((p) => p === 'eliminar-usuario-auth')).toHaveLength(1);
    expect(sesionGuardada()).not.toBeNull();
  });

  it('si el servidor falla al borrar el usuario de Auth, conserva la sesión para reintentar', async () => {
    const { caso, sesionGuardada } = montar({ eliminaciones: [err(new ServidorNoDisponibleError())] });
    const r = await caso.ejecutar();
    expect(!r.ok && r.error).toBeInstanceOf(ServidorNoDisponibleError);
    expect(sesionGuardada()).not.toBeNull();
  });

  it('si Google falla al desvincular, igual termina y borra la sesión local', async () => {
    const { caso, sesionGuardada } = montar({ googleLanza: true });
    const r = await caso.ejecutar();
    expect(r.ok).toBe(true);
    expect(sesionGuardada()).toBeNull();
  });
});

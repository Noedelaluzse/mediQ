import { describe, expect, it } from 'vitest';

import { ok } from '@/shared/kernel/Result';

import { crearSesion, type Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';
import { CerrarSesion } from './CerrarSesion';

const sesion = (): Sesion => {
  const r = crearSesion({
    accessToken: 'a',
    refreshToken: 'r',
    usuario: { id: 'u1', nombre: 'Ana', email: 'ana@mail.com' },
    primeraVez: false,
  });
  if (!r.ok) throw r.error;
  return r.value;
};

/** Registra el orden en que se llamó a cada pieza. */
const montar = (opciones: { googleLanza?: boolean; firebaseLanza?: boolean } = {}) => {
  const pasos: string[] = [];
  let guardada: Sesion | null = sesion();
  const store: SesionStore = {
    guardar: async (s) => void (guardada = s),
    leer: async () => guardada,
    borrar: async () => {
      pasos.push('borrar-sesion-local');
      guardada = null;
    },
  };
  const auth = {
    autenticarConGoogle: async () => ok(sesion()),
    cerrarSesion: async () => {
      pasos.push('cerrar-firebase');
      if (opciones.firebaseLanza) throw new Error('firebase');
    },
  };
  const identidad = {
    obtenerIdToken: async () => ok('t'),
    obtenerIdTokenSilencioso: async () => ok('t'),
    cerrarSesion: async () => {
      pasos.push('cerrar-google');
      if (opciones.googleLanza) throw new Error('google');
    },
  };
  return { pasos, caso: new CerrarSesion(store, auth, identidad), sesionGuardada: () => guardada };
};

describe('CerrarSesion (RF-04)', () => {
  it('cierra Firebase y Google y borra la sesión local, en ese orden', async () => {
    const { caso, pasos } = montar();
    await caso.ejecutar();
    expect(pasos).toEqual(['cerrar-firebase', 'cerrar-google', 'borrar-sesion-local']);
  });

  it('la sesión guardada en el dispositivo queda borrada', async () => {
    const { caso, sesionGuardada } = montar();
    await caso.ejecutar();
    expect(sesionGuardada()).toBeNull();
  });

  it('si Firebase falla al cerrar, igual cierra Google y borra la sesión local', async () => {
    const { caso, pasos, sesionGuardada } = montar({ firebaseLanza: true });
    await caso.ejecutar();
    expect(pasos).toEqual(['cerrar-firebase', 'cerrar-google', 'borrar-sesion-local']);
    expect(sesionGuardada()).toBeNull();
  });

  it('si Google falla al cerrar, igual borra la sesión local', async () => {
    const { caso, sesionGuardada } = montar({ googleLanza: true });
    await caso.ejecutar();
    expect(sesionGuardada()).toBeNull();
  });
});

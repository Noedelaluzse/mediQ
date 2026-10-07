import { describe, expect, it } from 'vitest';

import { SesionDesfasadaError } from './errors';
import type { Sesion } from './Sesion';
import { usuarioActivoId } from './UsuarioActivo';

const sesion = (id: string): Sesion => ({ accessToken: 'a', refreshToken: 'r', usuario: { id, nombre: 'N', email: 'n@x.com' }, primeraVez: false });

describe('usuarioActivoId (F039)', () => {
  it('sin sesión guardada lanza «No hay sesión activa»', () => {
    expect(() => usuarioActivoId(null, 'u1')).toThrow('No hay sesión activa');
    expect(() => usuarioActivoId(null, null)).toThrow('No hay sesión activa');
  });

  it('si Firebase Auth y la sesión guardada coinciden, devuelve ese uid', () => {
    expect(usuarioActivoId(sesion('u1'), 'u1')).toBe('u1');
  });

  it('si no coinciden, NUNCA devuelve un uid: lanza SesionDesfasadaError', () => {
    expect(() => usuarioActivoId(sesion('u1'), 'u2')).toThrow(SesionDesfasadaError);
  });

  it('sin usuario en Firebase Auth (modo simulado o aún sin restaurar) usa el de la sesión guardada', () => {
    expect(usuarioActivoId(sesion('u1'), null)).toBe('u1');
  });

  it('un uid vacío de Auth no se toma como válido', () => {
    expect(usuarioActivoId(sesion('u1'), '')).toBe('u1');
  });
});

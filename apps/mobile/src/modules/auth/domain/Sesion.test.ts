import { describe, expect, it } from 'vitest';

import { crearSesion } from './Sesion';

const base = {
  accessToken: 'a',
  refreshToken: 'r',
  usuario: { id: 'u1', nombre: 'Ana', email: 'ana@mail.com' },
  primeraVez: true,
};

describe('crearSesion', () => {
  it('crea una sesión válida', () => {
    const r = crearSesion(base);
    expect(r.ok).toBe(true);
  });

  it('rechaza tokens vacíos', () => {
    expect(crearSesion({ ...base, accessToken: '' }).ok).toBe(false);
    expect(crearSesion({ ...base, refreshToken: '  ' }).ok).toBe(false);
  });

  it('rechaza usuario sin id', () => {
    expect(crearSesion({ ...base, usuario: { ...base.usuario, id: '' } }).ok).toBe(false);
  });
});

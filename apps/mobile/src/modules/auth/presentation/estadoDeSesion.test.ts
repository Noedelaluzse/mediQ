import { describe, expect, it } from 'vitest';

import { DOCUMENTOS } from '../domain/Consentimiento';
import { crearSesion, type Sesion } from '../domain/Sesion';
import { accionTrasReintentar, derivarEstado, restaurarEstado } from './estadoDeSesion';

const sesion = (): Sesion => {
  const r = crearSesion({ accessToken: 'a', refreshToken: 'r', usuario: { id: 'u1', nombre: 'Ana', email: 'a@m.com' }, primeraVez: false });
  if (!r.ok) throw r.error;
  return r.value;
};

describe('derivarEstado', () => {
  it('sin leer todavía es «cargando»', () => {
    expect(derivarEstado(undefined)).toBe('cargando');
  });
  it('sin sesión, con aviso pendiente y activa', () => {
    expect(derivarEstado({ sesion: null, pendientes: [], sinVerificar: false })).toBe('sinSesion');
    expect(derivarEstado({ sesion: sesion(), pendientes: [...DOCUMENTOS], sinVerificar: false })).toBe('avisoPendiente');
    expect(derivarEstado({ sesion: sesion(), pendientes: [], sinVerificar: false })).toBe('activa');
  });
  it('una sesión sin verificar entra a la app (activa), no a la pantalla de inicio de sesión', () => {
    expect(derivarEstado({ sesion: sesion(), pendientes: [], sinVerificar: true })).toBe('activa');
  });
});

describe('restaurarEstado (qué se lee al abrir la app)', () => {
  it('con la sesión verificada consulta qué documentos faltan aceptar', async () => {
    let consultas = 0;
    const e = await restaurarEstado(
      async () => ({ sesion: sesion(), sinVerificar: false }),
      async () => (consultas++, ['terminos']),
    );
    expect(consultas).toBe(1);
    expect(e).toMatchObject({ pendientes: ['terminos'], sinVerificar: false });
  });

  it('sin verificar NO consulta los consentimientos (sin internet fallaría y mandaría a «Antes de empezar»)', async () => {
    let consultas = 0;
    const e = await restaurarEstado(
      async () => ({ sesion: sesion(), sinVerificar: true }),
      async () => (consultas++, [...DOCUMENTOS]),
    );
    expect(consultas).toBe(0);
    expect(e).toMatchObject({ pendientes: [], sinVerificar: true });
    expect(derivarEstado(e)).toBe('activa');
  });

  it('sin sesión no consulta nada', async () => {
    let consultas = 0;
    const e = await restaurarEstado(
      async () => ({ sesion: null, sinVerificar: false }),
      async () => (consultas++, []),
    );
    expect(consultas).toBe(0);
    expect(derivarEstado(e)).toBe('sinSesion');
  });
});

describe('accionTrasReintentar (al volver el internet se verifica la sesión guardada)', () => {
  it('si Google/Firebase la rechazan de verdad: cerrar la sesión y pedir iniciar de nuevo', () => {
    expect(accionTrasReintentar({ sesion: null, pendientes: [], sinVerificar: false })).toBe('cerrar-sesion');
  });
  it('si todavía no se pudo verificar: mantener y reintentar luego', () => {
    expect(accionTrasReintentar({ sesion: sesion(), pendientes: [], sinVerificar: true })).toBe('mantener');
  });
  it('si se verificó: actualizar (y ahora sí se comprueban los consentimientos)', () => {
    expect(accionTrasReintentar({ sesion: sesion(), pendientes: [], sinVerificar: false })).toBe('actualizar');
  });
});

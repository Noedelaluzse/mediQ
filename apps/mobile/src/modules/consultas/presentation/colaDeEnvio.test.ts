import { beforeEach, describe, expect, it } from 'vitest';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import { colaDeEnvio, enviosCompletados, limpiarColaDeEnvio, publicarCola, suscribirCola } from './colaDeEnvio';

const c = (id: string, extra: Partial<ConsultaPendiente> = {}): ConsultaPendiente => ({ id, entrada: { fecha: new Date(2026, 9, 4), especialidad: 'cardiologia' }, creadaEn: new Date(2026, 9, 5), intentos: 0, ...extra });

describe('colaDeEnvio (lo que ve la pantalla de la cola)', () => {
  beforeEach(limpiarColaDeEnvio);

  it('empieza vacía y sin envíos', () => {
    expect(colaDeEnvio()).toEqual([]);
    expect(enviosCompletados()).toBe(0);
  });

  it('publicar deja la lista y avisa a quien escucha', () => {
    let avisos = 0;
    const baja = suscribirCola(() => avisos++);
    publicarCola([c('a')]);
    expect(colaDeEnvio().map((x) => x.id)).toEqual(['a']);
    expect(avisos).toBe(1);
    baja();
  });

  it('publicar lo mismo otra vez no avisa de nuevo (así no se redibuja la pantalla en vano)', () => {
    let avisos = 0;
    suscribirCola(() => avisos++);
    publicarCola([c('a')]);
    const antes = colaDeEnvio();
    publicarCola([c('a')]);
    expect(avisos).toBe(1);
    expect(colaDeEnvio()).toBe(antes);
  });

  it('un cambio de intentos o de motivo sí cuenta como cambio', () => {
    let avisos = 0;
    suscribirCola(() => avisos++);
    publicarCola([c('a')]);
    publicarCola([c('a', { intentos: 1 })]);
    publicarCola([c('a', { intentos: 1, error: 'no' })]);
    expect(avisos).toBe(3);
  });

  it('cuando se envió algo, el contador de envíos suma lo enviado (el Diario recarga al verlo)', () => {
    publicarCola([c('a')]);
    publicarCola([], 1);
    expect(enviosCompletados()).toBe(1);
    publicarCola([], 0);
    expect(enviosCompletados()).toBe(1);
    publicarCola([], 2);
    expect(enviosCompletados()).toBe(3);
  });

  it('limpiar (cerrar sesión) vacía la cola y el contador', () => {
    publicarCola([c('a')], 1);
    limpiarColaDeEnvio();
    expect(colaDeEnvio()).toEqual([]);
    expect(enviosCompletados()).toBe(0);
  });
});

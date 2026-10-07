import { describe, expect, it } from 'vitest';

import type { Conectividad } from './Conectividad';
import { ConectividadVerificada } from './ConectividadVerificada';

/** La red del teléfono, a mano. */
class RedFalsa implements Conectividad {
  conectado = true;
  oyentes: ((c: boolean) => void)[] = [];
  async estaConectado() {
    return this.conectado;
  }
  suscribir(alCambiar: (c: boolean) => void) {
    this.oyentes.push(alCambiar);
    return () => {
      this.oyentes = this.oyentes.filter((o) => o !== alCambiar);
    };
  }
  cambiar(conectado: boolean) {
    this.conectado = conectado;
    this.oyentes.forEach((o) => o(conectado));
  }
}

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('ConectividadVerificada (F052: sin verificar la sesión, la app se porta como sin internet)', () => {
  it('con la sesión verificada es la red del teléfono', async () => {
    const red = new RedFalsa();
    const c = new ConectividadVerificada(red);
    expect(await c.estaConectado()).toBe(true);
    red.conectado = false;
    expect(await c.estaConectado()).toBe(false);
  });

  it('mientras la sesión está sin verificar dice «sin internet» aunque la red exista', async () => {
    const c = new ConectividadVerificada(new RedFalsa());
    c.ponerSinVerificar();
    expect(await c.estaConectado()).toBe(false);
  });

  it('al verificarse avisa a quien escucha que ya hay conexión (para que se envíen los pendientes)', async () => {
    const c = new ConectividadVerificada(new RedFalsa());
    const avisos: boolean[] = [];
    c.suscribir((v) => avisos.push(v));
    c.ponerSinVerificar();
    await esperar();
    c.ponerVerificada();
    await esperar();
    expect(avisos).toEqual([false, true]);
  });

  it('si vuelve la red pero la sesión sigue sin verificar, no avisa de conexión todavía', async () => {
    const red = new RedFalsa();
    const c = new ConectividadVerificada(red);
    c.ponerSinVerificar();
    const avisos: boolean[] = [];
    c.suscribir((v) => avisos.push(v));
    red.cambiar(true);
    await esperar();
    expect(avisos.every((v) => v === false)).toBe(true);
  });

  it('reenvía los cambios de la red cuando la sesión está verificada', async () => {
    const red = new RedFalsa();
    const c = new ConectividadVerificada(red);
    const avisos: boolean[] = [];
    c.suscribir((v) => avisos.push(v));
    red.cambiar(false);
    await esperar();
    red.cambiar(true);
    await esperar();
    expect(avisos).toEqual([false, true]);
  });

  it('dejar de escuchar funciona', async () => {
    const red = new RedFalsa();
    const c = new ConectividadVerificada(red);
    const avisos: boolean[] = [];
    const baja = c.suscribir((v) => avisos.push(v));
    baja();
    red.cambiar(false);
    await esperar();
    expect(avisos).toEqual([]);
  });
});

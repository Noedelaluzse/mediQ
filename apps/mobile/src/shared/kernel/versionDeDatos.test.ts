import { describe, expect, it } from 'vitest';

import { conInvalidaciones, marcarDatosCambiados, versionDeDatos } from './versionDeDatos';

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('versionDeDatos / marcarDatosCambiados', () => {
  it('cada cambio sube la versión', () => {
    const antes = versionDeDatos();
    marcarDatosCambiados();
    expect(versionDeDatos()).toBe(antes + 1);
    marcarDatosCambiados();
    expect(versionDeDatos()).toBe(antes + 2);
  });
});

describe('conInvalidaciones (las escrituras avisan que lo cargado quedó viejo)', () => {
  class Guardar {
    constructor(private readonly resultado: unknown) {}
    async ejecutar(a: number, b: number) {
      if (this.resultado instanceof Error) throw this.resultado;
      return { suma: a + b, yo: this.resultado };
    }
  }
  class Leer {
    async ejecutar() {
      return 'datos';
    }
  }

  it('al terminar bien una escritura sube la versión y devuelve lo mismo, con sus argumentos', async () => {
    const casos = conInvalidaciones({ guardar: new Guardar('x'), leer: new Leer() }, ['guardar']);
    const antes = versionDeDatos();
    await expect(casos.guardar.ejecutar(2, 3)).resolves.toEqual({ suma: 5, yo: 'x' });
    expect(versionDeDatos()).toBe(antes + 1);
  });

  it('si la escritura falla, también sube la versión (pudo cambiar algo a medias) y el error sigue llegando', async () => {
    const casos = conInvalidaciones({ guardar: new Guardar(new Error('sin red')) }, ['guardar']);
    const antes = versionDeDatos();
    await expect(casos.guardar.ejecutar(1, 1)).rejects.toThrow('sin red');
    await esperar();
    expect(versionDeDatos()).toBe(antes + 1);
  });

  it('las lecturas no tocan la versión', async () => {
    const casos = conInvalidaciones({ guardar: new Guardar('x'), leer: new Leer() }, ['guardar']);
    const antes = versionDeDatos();
    await expect(casos.leer.ejecutar()).resolves.toBe('datos');
    expect(versionDeDatos()).toBe(antes);
  });

  it('no sube la versión antes de que la escritura termine', async () => {
    let liberar!: () => void;
    const lenta = { ejecutar: () => new Promise<void>((r) => (liberar = r)) };
    const casos = conInvalidaciones({ lenta }, ['lenta']);
    const antes = versionDeDatos();
    const promesa = casos.lenta.ejecutar();
    expect(versionDeDatos()).toBe(antes);
    liberar();
    await promesa;
    expect(versionDeDatos()).toBe(antes + 1);
  });

  it('una escritura que responde de inmediato (sin promesa) también sube la versión', () => {
    const casos = conInvalidaciones({ directa: { ejecutar: (n: number) => n * 2 } }, ['directa']);
    const antes = versionDeDatos();
    expect(casos.directa.ejecutar(4)).toBe(8);
    expect(versionDeDatos()).toBe(antes + 1);
  });

  it('conserva `this` y el resto del objeto original', async () => {
    const original = new Guardar('x');
    const casos = conInvalidaciones({ guardar: original }, ['guardar']);
    expect(casos.guardar).toBeInstanceOf(Guardar);
    await expect(casos.guardar.ejecutar(1, 2)).resolves.toMatchObject({ yo: 'x' });
  });
});

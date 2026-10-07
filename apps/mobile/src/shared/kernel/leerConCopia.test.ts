import { describe, expect, it } from 'vitest';

import type { Conectividad } from './Conectividad';
import type { CopiaLocal } from './CopiaLocal';
import { leerConCopia } from './leerConCopia';
import { ErrorDeRed } from './red';

class Copia implements CopiaLocal {
  datos = new Map<string, string>();
  falla = false;
  async guardar(clave: string, contenido: string) {
    if (this.falla) throw new Error('disco lleno');
    this.datos.set(clave, contenido);
  }
  async leer(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  async limpiar() {
    this.datos.clear();
  }
}
const red = (conectado: boolean): Conectividad => ({ estaConectado: async () => conectado, suscribir: () => () => undefined });

const montar = (conectado: boolean, leer: () => Promise<number[]>, copia = new Copia()) => ({
  copia,
  ejecutar: () => leerConCopia<number[]>({ clave: 'k', copia, red: red(conectado), leer, aTexto: (v) => JSON.stringify(v), deTexto: (t) => (t.startsWith('[') ? (JSON.parse(t) as number[]) : null) }),
});

describe('leerConCopia', () => {
  it('con internet devuelve lo leído y guarda la copia', async () => {
    const { copia, ejecutar } = montar(true, async () => [1, 2]);
    expect(await ejecutar()).toEqual([1, 2]);
    expect(copia.datos.get('k')).toBe('[1,2]');
  });

  it('si no se puede guardar la copia, igual devuelve lo leído', async () => {
    const copia = new Copia();
    copia.falla = true;
    expect(await montar(true, async () => [1], copia).ejecutar()).toEqual([1]);
  });

  it('sin internet no consulta al servidor: devuelve la copia al instante', async () => {
    const copia = new Copia();
    copia.datos.set('k', '[9]');
    let consultas = 0;
    const { ejecutar } = montar(false, async () => (consultas++, [1]), copia);
    expect(await ejecutar()).toEqual([9]);
    expect(consultas).toBe(0);
  });

  it('sin internet y sin copia falla con ErrorDeRed (la pantalla muestra su error de siempre)', async () => {
    await expect(montar(false, async () => [1]).ejecutar()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('con internet que falla por red (o se agota el tiempo) devuelve la copia', async () => {
    const copia = new Copia();
    copia.datos.set('k', '[5]');
    expect(await montar(true, async () => Promise.reject(new ErrorDeRed()), copia).ejecutar()).toEqual([5]);
  });

  it('con internet que falla por red y sin copia, propaga el error original', async () => {
    const original = Object.assign(new Error('x'), { code: 'unavailable' });
    await expect(montar(true, async () => Promise.reject(original)).ejecutar()).rejects.toBe(original);
  });

  it('un error que NO es de red (permisos) se propaga aunque haya copia: no se esconde con datos viejos', async () => {
    const copia = new Copia();
    copia.datos.set('k', '[5]');
    const permisos = Object.assign(new Error('permiso'), { code: 'permission-denied' });
    await expect(montar(true, async () => Promise.reject(permisos), copia).ejecutar()).rejects.toBe(permisos);
  });

  it('una copia dañada cuenta como si no hubiera copia', async () => {
    const copia = new Copia();
    copia.datos.set('k', 'basura');
    await expect(montar(false, async () => [1], copia).ejecutar()).rejects.toBeInstanceOf(ErrorDeRed);
  });
});

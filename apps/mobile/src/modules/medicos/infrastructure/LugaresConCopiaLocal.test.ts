import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { ErrorDeRed } from '@/shared/kernel/red';

import type { Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';
import { LugaresConCopiaLocal } from './LugaresConCopiaLocal';

class Copia implements CopiaLocal {
  datos = new Map<string, string>();
  async guardar(clave: string, contenido: string) {
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

const clinica: Lugar = { id: 'l1', nombre: 'Clínica del Sureste' };
const hospital: Lugar = { id: 'l2', nombre: 'Hospital Morelos' };

class Real implements LugaresRepository {
  llamadas: string[] = [];
  async listar() {
    this.llamadas.push('listar');
    return [clinica, hospital];
  }
  async obtener(id: string) {
    this.llamadas.push(`obtener:${id}`);
    return id === 'l1' ? clinica : null;
  }
  async buscarPorClave(c: string) {
    this.llamadas.push(`buscar:${c}`);
    return null;
  }
  async crear() {
    this.llamadas.push('crear');
  }
  async renombrar() {
    this.llamadas.push('renombrar');
  }
  async contarConsultas() {
    this.llamadas.push('contar');
    return 5;
  }
  async consultasPorLugar() {
    this.llamadas.push('porLugar');
    return new Map([['l1', 4], ['l2', 1]]);
  }
  async eliminar() {
    this.llamadas.push('eliminar');
  }
}

describe('LugaresConCopiaLocal (F053: la lista de lugares y «Usados antes» sin internet)', () => {
  it('con internet lista lo real y guarda la copia; sin internet lista la copia sin llamar al servidor', async () => {
    const copia = new Copia();
    expect(await new LugaresConCopiaLocal(new Real(), copia, red(true)).listar()).toEqual([clinica, hospital]);
    const real = new Real();
    expect(await new LugaresConCopiaLocal(real, copia, red(false)).listar()).toEqual([clinica, hospital]);
    expect(real.llamadas).toEqual([]);
  });

  it('el conteo de consultas por lugar también se copia (con sus números) y se lee sin internet', async () => {
    const copia = new Copia();
    await new LugaresConCopiaLocal(new Real(), copia, red(true)).consultasPorLugar();
    const real = new Real();
    const sinRed = await new LugaresConCopiaLocal(real, copia, red(false)).consultasPorLugar();
    expect(Object.fromEntries(sinRed)).toEqual({ l1: 4, l2: 1 });
    expect(real.llamadas).toEqual([]);
  });

  it('sin internet y sin copia falla con ErrorDeRed', async () => {
    const c = new LugaresConCopiaLocal(new Real(), new Copia(), red(false));
    await expect(c.listar()).rejects.toBeInstanceOf(ErrorDeRed);
    await expect(c.consultasPorLugar()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('una copia dañada o con otra forma se ignora', async () => {
    for (const texto of ['{no es json', '3', '[{"x":1}]']) {
      const copia = new Copia();
      copia.datos.set('lugares', texto);
      copia.datos.set('consultas-por-lugar', texto);
      const c = new LugaresConCopiaLocal(new Real(), copia, red(false));
      await expect(c.listar()).rejects.toBeInstanceOf(ErrorDeRed);
      await expect(c.consultasPorLugar()).rejects.toBeInstanceOf(ErrorDeRed);
    }
  });

  it('lo demás (obtener, buscar, crear, renombrar, contar, eliminar) pasa directo: son para editar y editar necesita internet', async () => {
    const real = new Real();
    const c = new LugaresConCopiaLocal(real, new Copia(), red(true));
    expect(await c.obtener('l1')).toEqual(clinica);
    await c.buscarPorClave('x');
    await c.crear(clinica);
    await c.renombrar('l1', 'Otro');
    expect(await c.contarConsultas('l1')).toBe(5);
    await c.eliminar('l1');
    expect(real.llamadas).toEqual(['obtener:l1', 'buscar:x', 'crear', 'renombrar', 'contar', 'eliminar']);
  });
});

import { describe, expect, it } from 'vitest';

import type { BaseSqlite } from './BaseSqlite';
import { SqliteCopiaLocal } from './SqliteCopiaLocal';

/** Base falsa que entiende solo las sentencias del repositorio (la real se prueba en el simulador). */
class BaseFalsa implements BaseSqlite {
  tablas = 0;
  filas = new Map<string, string>();
  async execAsync(sql: string) {
    if (/CREATE TABLE IF NOT EXISTS copia_local/i.test(sql)) this.tablas += 1;
  }
  async runAsync(sql: string, ...params: unknown[]) {
    if (/^INSERT OR REPLACE INTO copia_local/i.test(sql)) this.filas.set(`${params[0]}|${params[1]}`, String(params[2]));
    else if (/^DELETE FROM copia_local WHERE usuario_id = \?$/i.test(sql)) {
      for (const k of [...this.filas.keys()]) if (k.startsWith(`${params[0]}|`)) this.filas.delete(k);
    } else throw new Error(`SQL inesperado: ${sql}`);
  }
  async getFirstAsync<T>(sql: string, ...params: unknown[]) {
    if (!/^SELECT contenido FROM copia_local/i.test(sql)) throw new Error(`SQL inesperado: ${sql}`);
    const contenido = this.filas.get(`${params[0]}|${params[1]}`);
    return (contenido === undefined ? null : { contenido }) as T | null;
  }
}

const montar = (uid = 'u1', base = new BaseFalsa()) => ({ base, copia: new SqliteCopiaLocal(async () => base, async () => uid) });

describe('SqliteCopiaLocal', () => {
  it('guarda y vuelve a leer; sin nada devuelve null', async () => {
    const { copia } = montar();
    expect(await copia.leer('diario')).toBeNull();
    await copia.guardar('diario', '[1]');
    expect(await copia.leer('diario')).toBe('[1]');
  });

  it('guardar de nuevo reemplaza; cada clave es independiente', async () => {
    const { copia } = montar();
    await copia.guardar('a', '1');
    await copia.guardar('b', '2');
    await copia.guardar('a', '3');
    expect([await copia.leer('a'), await copia.leer('b')]).toEqual(['3', '2']);
  });

  it('cada usuario tiene su propia copia (no se mezclan en el mismo teléfono)', async () => {
    const base = new BaseFalsa();
    const de = (uid: string) => montar(uid, base).copia;
    await de('ana').guardar('diario', 'de Ana');
    await de('beto').guardar('diario', 'de Beto');
    expect(await de('ana').leer('diario')).toBe('de Ana');
    expect(await de('beto').leer('diario')).toBe('de Beto');
  });

  it('limpiar borra todo lo de este usuario y nada del otro', async () => {
    const base = new BaseFalsa();
    const de = (uid: string) => montar(uid, base).copia;
    await de('ana').guardar('diario', 'a');
    await de('ana').guardar('medicos', 'b');
    await de('beto').guardar('diario', 'c');
    await de('ana').limpiar();
    expect(await de('ana').leer('diario')).toBeNull();
    expect(await de('ana').leer('medicos')).toBeNull();
    expect(await de('beto').leer('diario')).toBe('c');
  });

  it('crea la tabla una sola vez', async () => {
    const { base, copia } = montar();
    await copia.guardar('a', '1');
    await copia.leer('a');
    await copia.limpiar();
    expect(base.tablas).toBe(1);
  });
});

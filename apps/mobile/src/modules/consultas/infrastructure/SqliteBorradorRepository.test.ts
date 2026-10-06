import { describe, expect, it } from 'vitest';

import type { BorradorDeConsulta } from '../domain/Borrador';
import type { BaseSqlite } from './BaseSqlite';
import { SqliteBorradorRepository } from './SqliteBorradorRepository';

/** Base falsa que entiende solo las cuatro sentencias del repositorio (la real se prueba en el simulador). */
class BaseFalsa implements BaseSqlite {
  tablas = 0;
  filas = new Map<string, string>();
  async execAsync(sql: string) {
    if (/CREATE TABLE IF NOT EXISTS borradores/i.test(sql)) this.tablas += 1;
  }
  async runAsync(sql: string, ...params: unknown[]) {
    if (/^INSERT OR REPLACE INTO borradores/i.test(sql)) this.filas.set(String(params[0]), String(params[1]));
    else if (/^DELETE FROM borradores/i.test(sql)) this.filas.delete(String(params[0]));
    else throw new Error(`SQL inesperado: ${sql}`);
  }
  async getFirstAsync<T>(sql: string, ...params: unknown[]) {
    if (!/^SELECT contenido FROM borradores/i.test(sql)) throw new Error(`SQL inesperado: ${sql}`);
    const contenido = this.filas.get(String(params[0]));
    return (contenido === undefined ? null : { contenido }) as T | null;
  }
}

const borrador: BorradorDeConsulta = {
  fecha: '2026-10-05T09:30:00.000Z',
  hora: '2026-10-05T09:30:00.000Z',
  especialidad: 'cardiologia',
  lugar: 'Clínica del Sureste',
  consultorio: '204',
  medicoNombre: 'Dra. Mariana Solís',
  medicoTelefono: '998 555 0142',
  medicoCedula: '',
  motivo: 'Revisión',
  notasDelMedico: 'Bajar la sal',
  indicaciones: ['Medir la presión'],
  proximaCita: null,
};

const montar = (uid = 'u1') => {
  const base = new BaseFalsa();
  return { base, repo: new SqliteBorradorRepository(async () => base, async () => uid) };
};

describe('SqliteBorradorRepository', () => {
  it('guarda y vuelve a leer el borrador completo', async () => {
    const { repo } = montar();
    await repo.guardar(borrador);
    expect(await repo.leer()).toEqual(borrador);
  });

  it('sin borrador devuelve null', async () => {
    expect(await montar().repo.leer()).toBeNull();
  });

  it('guardar de nuevo reemplaza el anterior', async () => {
    const { repo } = montar();
    await repo.guardar(borrador);
    await repo.guardar({ ...borrador, motivo: 'Otro' });
    expect((await repo.leer())?.motivo).toBe('Otro');
  });

  it('borrar elimina el borrador', async () => {
    const { repo } = montar();
    await repo.guardar(borrador);
    await repo.borrar();
    expect(await repo.leer()).toBeNull();
  });

  it('cada usuario tiene su propio borrador', async () => {
    const base = new BaseFalsa();
    const de = (uid: string) => new SqliteBorradorRepository(async () => base, async () => uid);
    await de('ana').guardar({ ...borrador, motivo: 'de Ana' });
    await de('beto').guardar({ ...borrador, motivo: 'de Beto' });
    expect((await de('ana').leer())?.motivo).toBe('de Ana');
    expect((await de('beto').leer())?.motivo).toBe('de Beto');
    await de('ana').borrar();
    expect(await de('ana').leer()).toBeNull();
    expect((await de('beto').leer())?.motivo).toBe('de Beto');
  });

  it('crea la tabla una sola vez', async () => {
    const { base, repo } = montar();
    await repo.guardar(borrador);
    await repo.leer();
    await repo.borrar();
    expect(base.tablas).toBe(1);
  });

  it('un contenido dañado se trata como sin borrador', async () => {
    const { base, repo } = montar();
    base.filas.set('u1', '{no es json');
    expect(await repo.leer()).toBeNull();
  });
});

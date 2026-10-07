import { describe, expect, it } from 'vitest';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import type { BaseSqlite } from './BaseSqlite';
import { SqliteColaDeEnvioRepository } from './SqliteColaDeEnvioRepository';

/** Base falsa que entiende solo las sentencias del repositorio (la real se prueba en el simulador). */
class BaseFalsa implements BaseSqlite {
  tablas = 0;
  filas = new Map<string, string>();
  async execAsync(sql: string) {
    if (/CREATE TABLE IF NOT EXISTS cola_de_envio/i.test(sql)) this.tablas += 1;
  }
  async runAsync(sql: string, ...params: unknown[]) {
    if (/^INSERT OR REPLACE INTO cola_de_envio/i.test(sql)) this.filas.set(String(params[0]), String(params[1]));
    else if (/^DELETE FROM cola_de_envio/i.test(sql)) this.filas.delete(String(params[0]));
    else throw new Error(`SQL inesperado: ${sql}`);
  }
  async getFirstAsync<T>(sql: string, ...params: unknown[]) {
    if (!/^SELECT contenido FROM cola_de_envio/i.test(sql)) throw new Error(`SQL inesperado: ${sql}`);
    const contenido = this.filas.get(String(params[0]));
    return (contenido === undefined ? null : { contenido }) as T | null;
  }
}

const c = (id: string, minutos: number, extra: Partial<ConsultaPendiente> = {}): ConsultaPendiente => ({
  id,
  entrada: { fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'cardiologia', motivo: id },
  creadaEn: new Date(2026, 9, 5, 10, minutos),
  intentos: 0,
  ...extra,
});

const montar = (uid = 'u1', base = new BaseFalsa()) => ({ base, repo: new SqliteColaDeEnvioRepository(async () => base, async () => uid) });

describe('SqliteColaDeEnvioRepository', () => {
  it('sin nada, la cola está vacía', async () => {
    expect(await montar().repo.listar()).toEqual([]);
  });

  it('agrega y lista en el orden en que se capturaron', async () => {
    const { repo } = montar();
    await repo.agregar(c('b', 5));
    await repo.agregar(c('a', 1));
    expect((await repo.listar()).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('actualiza una (intentos, motivo de rechazo) sin tocar las demás', async () => {
    const { repo } = montar();
    await repo.agregar(c('a', 1));
    await repo.agregar(c('b', 2));
    await repo.actualizar(c('a', 1, { intentos: 3, error: 'no' }));
    expect(await repo.listar()).toEqual([c('a', 1, { intentos: 3, error: 'no' }), c('b', 2)]);
  });

  it('quita una; quitar una que no está no falla', async () => {
    const { repo } = montar();
    await repo.agregar(c('a', 1));
    await repo.agregar(c('b', 2));
    await repo.quitar('a');
    await repo.quitar('no-existe');
    expect((await repo.listar()).map((x) => x.id)).toEqual(['b']);
  });

  it('agregar la misma consulta dos veces la deja una sola (mismo id)', async () => {
    const { repo } = montar();
    await repo.agregar(c('a', 1));
    await repo.agregar(c('a', 1, { intentos: 1 }));
    expect(await repo.listar()).toHaveLength(1);
  });

  it('operaciones simultáneas no se pisan (agregar y actualizar a la vez conservan todo)', async () => {
    const { repo } = montar();
    await repo.agregar(c('a', 1));
    await Promise.all([repo.agregar(c('b', 2)), repo.agregar(c('c', 3)), repo.actualizar(c('a', 1, { intentos: 1 })), repo.quitar('c')]);
    expect((await repo.listar()).map((x) => [x.id, x.intentos])).toEqual([
      ['a', 1],
      ['b', 0],
    ]);
  });

  it('cada usuario tiene su propia cola', async () => {
    const base = new BaseFalsa();
    const de = (uid: string) => montar(uid, base).repo;
    await de('ana').agregar(c('a', 1));
    await de('beto').agregar(c('b', 1));
    expect((await de('ana').listar()).map((x) => x.id)).toEqual(['a']);
    await de('ana').quitar('a');
    expect((await de('beto').listar()).map((x) => x.id)).toEqual(['b']);
  });

  it('una cola vaciada no deja una fila vacía (se borra la fila)', async () => {
    const { base, repo } = montar();
    await repo.agregar(c('a', 1));
    await repo.quitar('a');
    expect(base.filas.size).toBe(0);
  });

  it('vaciar borra la cola de ese usuario y no la del otro', async () => {
    const base = new BaseFalsa();
    const de = (uid: string) => montar(uid, base).repo;
    await de('ana').agregar(c('a', 1));
    await de('ana').agregar(c('b', 2));
    await de('beto').agregar(c('x', 1));
    await de('ana').vaciar();
    expect(await de('ana').listar()).toEqual([]);
    expect((await de('beto').listar()).map((x) => x.id)).toEqual(['x']);
  });

  it('crea la tabla una sola vez', async () => {
    const { base, repo } = montar();
    await repo.agregar(c('a', 1));
    await repo.listar();
    await repo.quitar('a');
    expect(base.tablas).toBe(1);
  });
});

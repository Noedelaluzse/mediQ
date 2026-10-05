import { describe, expect, it } from 'vitest';

import { DemasiadasIndicacionesError, IndicacionInvalidaError, IndicacionNoEncontradaError } from '../domain/errors';
import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';
import { AgregarIndicacion } from './AgregarIndicacion';
import { AlternarIndicacion } from './AlternarIndicacion';
import { ListarIndicaciones } from './ListarIndicaciones';
import { QuitarIndicacion } from './QuitarIndicacion';

class Repo implements IndicacionesRepository {
  porConsulta = new Map<string, Indicacion[]>();
  async listar(consultaId: string) {
    return [...(this.porConsulta.get(consultaId) ?? [])];
  }
  async guardar(consultaId: string, i: Indicacion) {
    const otras = (this.porConsulta.get(consultaId) ?? []).filter((x) => x.id !== i.id);
    this.porConsulta.set(consultaId, [...otras, i]);
  }
  async quitar(consultaId: string, id: string) {
    this.porConsulta.set(consultaId, (this.porConsulta.get(consultaId) ?? []).filter((x) => x.id !== id));
  }
}

const ids = () => {
  let n = 0;
  return () => `i${++n}`;
};

describe('AgregarIndicacion', () => {
  it('agrega al final de la lista de esa consulta', async () => {
    const repo = new Repo();
    const uc = new AgregarIndicacion(repo, ids());
    await uc.ejecutar('c1', 'Medir la presión');
    const r = await uc.ejecutar('c1', '  Análisis en ayunas ');
    expect(r.ok && r.value).toMatchObject({ texto: 'Análisis en ayunas', orden: 1 });
    expect((await repo.listar('c1')).map((x) => x.texto)).toEqual(['Medir la presión', 'Análisis en ayunas']);
  });

  it('rechaza un texto vacío', async () => {
    const r = await new AgregarIndicacion(new Repo(), ids()).ejecutar('c1', '  ');
    expect(!r.ok && r.error).toBeInstanceOf(IndicacionInvalidaError);
  });

  it('no pasa de 30 indicaciones por consulta', async () => {
    const repo = new Repo();
    repo.porConsulta.set('c1', Array.from({ length: 30 }, (_, n) => ({ id: `x${n}`, texto: 't', orden: n })));
    const r = await new AgregarIndicacion(repo, ids()).ejecutar('c1', 'una más');
    expect(!r.ok && r.error).toBeInstanceOf(DemasiadasIndicacionesError);
  });

  it('el orden sigue creciendo aunque se hayan quitado indicaciones del medio', async () => {
    const repo = new Repo();
    repo.porConsulta.set('c1', [{ id: 'a', texto: 'uno', orden: 0 }, { id: 'c', texto: 'tres', orden: 5 }]);
    const r = await new AgregarIndicacion(repo, ids()).ejecutar('c1', 'cuatro');
    expect(r.ok && r.value.orden).toBe(6);
  });
});

describe('AlternarIndicacion (marcar como hecha)', () => {
  it('marca una pendiente y la desmarca al repetir', async () => {
    const repo = new Repo();
    repo.porConsulta.set('c1', [{ id: 'a', texto: 'uno', orden: 0 }]);
    const hoy = new Date(2026, 9, 5);
    const uc = new AlternarIndicacion(repo, () => hoy);

    const marcada = await uc.ejecutar('c1', 'a');
    expect(marcada.ok && marcada.value.hechaEn).toEqual(hoy);
    expect((await repo.listar('c1'))[0].hechaEn).toEqual(hoy);

    const desmarcada = await uc.ejecutar('c1', 'a');
    expect(desmarcada.ok && desmarcada.value.hechaEn).toBeUndefined();
  });

  it('una indicación que no existe devuelve IndicacionNoEncontradaError', async () => {
    const r = await new AlternarIndicacion(new Repo(), () => new Date()).ejecutar('c1', 'x');
    expect(!r.ok && r.error).toBeInstanceOf(IndicacionNoEncontradaError);
  });
});

describe('QuitarIndicacion y ListarIndicaciones', () => {
  it('quita una indicación y las demás se conservan, en orden', async () => {
    const repo = new Repo();
    repo.porConsulta.set('c1', [
      { id: 'b', texto: 'dos', orden: 1 },
      { id: 'a', texto: 'uno', orden: 0 },
      { id: 'c', texto: 'tres', orden: 2 },
    ]);
    await new QuitarIndicacion(repo).ejecutar('c1', 'b');
    expect((await new ListarIndicaciones(repo).ejecutar('c1')).map((x) => x.texto)).toEqual(['uno', 'tres']);
  });
});

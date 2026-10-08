import { describe, expect, it } from 'vitest';

import { LugarDuplicadoError, LugarNoEncontradoError, NombreDeLugarInvalidoError } from '../domain/errors';
import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';
import { AgregarLugar } from './AgregarLugar';
import { EliminarLugar } from './EliminarLugar';
import { ListarLugares } from './ListarLugares';
import { RenombrarLugar } from './RenombrarLugar';

class LugaresEnMemoria implements LugaresRepository {
  datos = new Map<string, Lugar>();
  consultas = new Map<string, number>();
  eliminados: string[] = [];
  renombrados: { id: string; nombre: string }[] = [];
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async buscarPorClave(clave: string) {
    return [...this.datos.values()].find((l) => claveDeLugar(l.nombre) === clave) ?? null;
  }
  async crear(l: Lugar) {
    this.datos.set(l.id, l);
  }
  async renombrar(id: string, nombre: string) {
    this.renombrados.push({ id, nombre });
    const actual = this.datos.get(id);
    if (actual) this.datos.set(id, { ...actual, nombre });
  }
  contadasUnoAUno = 0;
  async contarConsultas(id: string) {
    this.contadasUnoAUno++;
    return this.consultas.get(id) ?? 0;
  }
  async consultasPorLugar() {
    return new Map(this.consultas);
  }
  async eliminar(id: string) {
    this.eliminados.push(id);
    this.datos.delete(id);
  }
}

const ids = () => {
  let n = 0;
  return () => `lugar-${++n}`;
};

describe('AgregarLugar', () => {
  it('agrega un lugar nuevo', async () => {
    const repo = new LugaresEnMemoria();
    const r = await new AgregarLugar(repo, ids()).ejecutar('Hospital Morelos');
    expect(r.ok && r.value.nombre).toBe('Hospital Morelos');
    expect(repo.datos.size).toBe(1);
  });

  it('rechaza un nombre vacío', async () => {
    const r = await new AgregarLugar(new LugaresEnMemoria(), ids()).ejecutar('   ');
    expect(!r.ok && r.error).toBeInstanceOf(NombreDeLugarInvalidoError);
  });

  it('rechaza un lugar que ya existe, aunque cambien mayúsculas, acentos o espacios', async () => {
    const repo = new LugaresEnMemoria();
    const agregar = new AgregarLugar(repo, ids());
    await agregar.ejecutar('Clínica del Sureste');
    const r = await agregar.ejecutar('  clinica DEL   sureste');
    expect(!r.ok && r.error).toBeInstanceOf(LugarDuplicadoError);
    expect(repo.datos.size).toBe(1);
  });
});

describe('RenombrarLugar', () => {
  const montar = async () => {
    const repo = new LugaresEnMemoria();
    const agregar = new AgregarLugar(repo, ids());
    await agregar.ejecutar('Hosp. Morelos'); // lugar-1
    await agregar.ejecutar('Hospital Morelos'); // lugar-2
    return repo;
  };

  it('renombra un lugar', async () => {
    const repo = await montar();
    const r = await new RenombrarLugar(repo).ejecutar('lugar-1', 'Hospital General Morelos');
    expect(r.ok).toBe(true);
    expect(repo.renombrados).toEqual([{ id: 'lugar-1', nombre: 'Hospital General Morelos' }]);
  });

  it('rechaza renombrar a un nombre que ya tiene otro lugar (decisión del usuario)', async () => {
    const repo = await montar();
    const r = await new RenombrarLugar(repo).ejecutar('lugar-1', 'hospital morelos');
    expect(!r.ok && r.error).toBeInstanceOf(LugarDuplicadoError);
    expect(repo.renombrados).toEqual([]);
  });

  it('permite corregir solo mayúsculas o acentos del mismo lugar', async () => {
    const repo = await montar();
    const r = await new RenombrarLugar(repo).ejecutar('lugar-2', 'HOSPITAL MORELOS');
    expect(r.ok).toBe(true);
  });

  it('rechaza un nombre vacío', async () => {
    const repo = await montar();
    const r = await new RenombrarLugar(repo).ejecutar('lugar-1', ' ');
    expect(!r.ok && r.error).toBeInstanceOf(NombreDeLugarInvalidoError);
  });

  it('renombrar un lugar que no existe devuelve LugarNoEncontradoError', async () => {
    const r = await new RenombrarLugar(new LugaresEnMemoria()).ejecutar('fantasma', 'Algo');
    expect(!r.ok && r.error).toBeInstanceOf(LugarNoEncontradoError);
  });
});

describe('EliminarLugar', () => {
  it('elimina el lugar (las consultas se conservan sin lugar)', async () => {
    const repo = new LugaresEnMemoria();
    await new AgregarLugar(repo, ids()).ejecutar('Clínica del Sureste');
    repo.consultas.set('lugar-1', 6);
    const r = await new EliminarLugar(repo).ejecutar('lugar-1');
    expect(r.ok).toBe(true);
    expect(repo.eliminados).toEqual(['lugar-1']);
  });

  it('eliminar uno que no existe devuelve LugarNoEncontradoError', async () => {
    const r = await new EliminarLugar(new LugaresEnMemoria()).ejecutar('fantasma');
    expect(!r.ok && r.error).toBeInstanceOf(LugarNoEncontradoError);
  });
});

describe('ListarLugares', () => {
  it('lista los lugares ordenados por nombre con su número de consultas', async () => {
    const repo = new LugaresEnMemoria();
    const agregar = new AgregarLugar(repo, ids());
    await agregar.ejecutar('Hospital Morelos'); // lugar-1
    await agregar.ejecutar('Clínica del Sureste'); // lugar-2
    repo.consultas.set('lugar-1', 4);
    repo.consultas.set('lugar-2', 6);

    const lista = await new ListarLugares(repo).ejecutar();

    expect(lista.map((x) => [x.lugar.nombre, x.consultas])).toEqual([
      ['Clínica del Sureste', 6],
      ['Hospital Morelos', 4],
    ]);
  });

  it('cuenta las consultas de todos los lugares en una sola lectura, no una por lugar (F053)', async () => {
    const repo = new LugaresEnMemoria();
    const agregar = new AgregarLugar(repo, ids());
    for (const nombre of ['A', 'B', 'C', 'D']) await agregar.ejecutar(nombre);
    await new ListarLugares(repo).ejecutar();
    expect(repo.contadasUnoAUno).toBe(0);
  });

  it('un lugar sin consultas sale con 0', async () => {
    const repo = new LugaresEnMemoria();
    await new AgregarLugar(repo, ids()).ejecutar('Clínica');
    const lista = await new ListarLugares(repo).ejecutar();
    expect(lista[0].consultas).toBe(0);
  });
});

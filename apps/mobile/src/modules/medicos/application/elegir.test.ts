import { describe, expect, it } from 'vitest';

import type { ResumenDeConsultas } from '../domain/Consultas';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { BuscarMedicosParaElegir } from './BuscarMedicosParaElegir';
import { ElegirMedicoGuardado } from './ElegirMedicoGuardado';
import { ListarLugaresUsadosAntes } from './ListarLugaresUsadosAntes';

const solis: Medico = { id: 'a', nombreCompleto: 'Dra. Mariana Solís', especialidad: 'cardiologia', telefono: '998 555 0142', cedula: '123' };
const pech: Medico = { id: 'b', nombreCompleto: 'Dr. Julián Pech', especialidad: 'medicina-general' };
const canul: Medico = { id: 'c', nombreCompleto: 'Dra. Ana Canul', especialidad: 'odontologia' };

const medicos = (lista: Medico[]): MedicosRepository => ({
  listar: async () => [...lista],
  obtener: async (id) => lista.find((m) => m.id === id) ?? null,
  guardar: async () => {},
  contarConsultas: async () => 0,
  eliminar: async () => {},
});

const consultas = (resumen: Record<string, ResumenDeConsultas>): ConsultasDeMedicosRepository => ({
  resumenPorMedico: async () => new Map(Object.entries(resumen)),
  deMedico: async () => [],
  contarTodas: async () => 0,
  contarConReceta: async () => 0,
});

const RESUMEN = {
  a: { consultas: 4, lugares: ['Clínica del Sureste', 'Hospital Morelos'] },
  b: { consultas: 7, lugares: ['Hospital Morelos'] },
};

describe('BuscarMedicosParaElegir (HU-08)', () => {
  const montar = () => new BuscarMedicosParaElegir(medicos([solis, pech, canul]), consultas(RESUMEN));

  it('sin búsqueda trae a todos por nombre, con los lugares donde atienden', async () => {
    const r = await montar().ejecutar('');
    expect(r.map((x) => x.medico.id)).toEqual(['b', 'c', 'a']);
    expect(r.find((x) => x.medico.id === 'a')?.lugares).toEqual(['Clínica del Sureste', 'Hospital Morelos']);
    expect(r.find((x) => x.medico.id === 'c')?.lugares).toEqual([]);
  });

  it('filtra por nombre o especialidad', async () => {
    expect((await montar().ejecutar('solis')).map((x) => x.medico.id)).toEqual(['a']);
    expect((await montar().ejecutar('odonto')).map((x) => x.medico.id)).toEqual(['c']);
  });

  it('sin coincidencias devuelve lista vacía', async () => {
    expect(await montar().ejecutar('zzz')).toEqual([]);
  });
});

describe('ElegirMedicoGuardado (HU-08: "Elegir guardado" llena nombre, lugar, teléfono y especialidad)', () => {
  const montar = () => new ElegirMedicoGuardado(medicos([solis, canul]), consultas(RESUMEN));

  it('devuelve los datos para rellenar la consulta, con el lugar donde más lo ha visto', async () => {
    expect(await montar().ejecutar('a')).toEqual({
      medicoId: 'a',
      nombre: 'Dra. Mariana Solís',
      especialidad: 'cardiologia',
      telefono: '998 555 0142',
      cedula: '123',
      lugar: 'Clínica del Sureste',
    });
  });

  it('si nunca lo ha visto no sugiere lugar', async () => {
    const r = await montar().ejecutar('c');
    expect(r).toMatchObject({ medicoId: 'c', nombre: 'Dra. Ana Canul', lugar: undefined });
  });

  it('si el médico ya no existe devuelve null', async () => {
    expect(await montar().ejecutar('fantasma')).toBeNull();
  });
});

describe('ListarLugaresUsadosAntes (RF-22: reutilizar un lugar)', () => {
  const lugares = (lista: Lugar[], usos: Record<string, number>): LugaresRepository => ({
    listar: async () => lista,
    obtener: async () => null,
    buscarPorClave: async () => null,
    crear: async () => {},
    renombrar: async () => {},
    contarConsultas: async (id) => usos[id] ?? 0,
    eliminar: async () => {},
  });
  const L = [
    { id: '1', nombre: 'Hospital Morelos' },
    { id: '2', nombre: 'Clínica del Sureste' },
    { id: '3', nombre: 'Consultorio Similares' },
    { id: '4', nombre: 'Laboratorio' },
  ];

  it('ordena del más usado al menos, desempatando por nombre', async () => {
    const r = await new ListarLugaresUsadosAntes(lugares(L, { '1': 4, '2': 6, '3': 4 })).ejecutar();
    expect(r.map((x) => x.nombre)).toEqual(['Clínica del Sureste', 'Consultorio Similares', 'Hospital Morelos', 'Laboratorio']);
  });

  it('limita la cantidad de sugerencias', async () => {
    const r = await new ListarLugaresUsadosAntes(lugares(L, { '1': 1 })).ejecutar(2);
    expect(r).toHaveLength(2);
    expect(r[0].nombre).toBe('Hospital Morelos');
  });

  it('sin lugares devuelve vacío', async () => {
    expect(await new ListarLugaresUsadosAntes(lugares([], {})).ejecutar()).toEqual([]);
  });
});

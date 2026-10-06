import { describe, expect, it } from 'vitest';

import type { ConsultaDeMedico, ResumenDeConsultas } from '../domain/Consultas';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { ListarDirectorio } from './ListarDirectorio';
import { ObtenerDetalleDeMedico } from './ObtenerDetalleDeMedico';
import { ResumenDePerfil } from './ResumenDePerfil';

const medico = (id: string, nombreCompleto: string): Medico => ({ id, nombreCompleto, especialidad: 'cardiologia' });

class Medicos implements MedicosRepository {
  constructor(private readonly lista: Medico[]) {}
  async listar() {
    return [...this.lista];
  }
  async obtener(id: string) {
    return this.lista.find((m) => m.id === id) ?? null;
  }
  async guardar() {}
  async contarConsultas() {
    return 0;
  }
  async eliminar() {}
}

class Consultas implements ConsultasDeMedicosRepository {
  constructor(
    private readonly porMedico: Record<string, ConsultaDeMedico[]> = {},
    private readonly conReceta = 0,
  ) {}
  async resumenPorMedico() {
    const r = new Map<string, ResumenDeConsultas>();
    for (const [id, cs] of Object.entries(this.porMedico)) {
      const ultima = cs.map((c) => c.fecha).sort((a, b) => b.getTime() - a.getTime())[0];
      r.set(id, { consultas: cs.length, ultimaVisita: ultima, lugares: [] });
    }
    return r;
  }
  async deMedico(id: string) {
    return [...(this.porMedico[id] ?? [])].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }
  async contarTodas() {
    return Object.values(this.porMedico).reduce((n, cs) => n + cs.length, 0);
  }
  async contarConReceta() {
    return this.conReceta;
  }
}

const c = (id: string, y: number, m: number, d: number, lugar?: string, motivo?: string): ConsultaDeMedico => ({
  id,
  fecha: new Date(y, m - 1, d),
  lugar,
  motivo,
});

describe('ListarDirectorio (RF-21)', () => {
  it('lista a los médicos por nombre con su número de consultas y última visita', async () => {
    const medicos = new Medicos([medico('a', 'Dr. Julián Pech'), medico('b', 'Dra. Ana Canul')]);
    const consultas = new Consultas({ a: [c('1', 2026, 9, 15), c('2', 2026, 8, 1)], b: [c('3', 2026, 9, 2)] });

    const r = await new ListarDirectorio(medicos, consultas).ejecutar();

    expect(r.map((x) => [x.medico.nombreCompleto, x.consultas, x.ultimaVisita])).toEqual([
      ['Dr. Julián Pech', 2, new Date(2026, 8, 15)],
      ['Dra. Ana Canul', 1, new Date(2026, 8, 2)],
    ]);
  });

  it('ordena sin distinguir mayúsculas ni acentos', async () => {
    const medicos = new Medicos([medico('1', 'Ana Ruiz'), medico('2', 'Álvaro Díaz'), medico('3', 'pech')]);
    const r = await new ListarDirectorio(medicos, new Consultas()).ejecutar();
    expect(r.map((x) => x.medico.id)).toEqual(['2', '1', '3']);
  });

  it('un médico sin consultas muestra 0 y sin última visita', async () => {
    const r = await new ListarDirectorio(new Medicos([medico('a', 'Dr. Nuevo')]), new Consultas()).ejecutar();
    expect(r[0]).toMatchObject({ consultas: 0, ultimaVisita: undefined });
  });
});

describe('ObtenerDetalleDeMedico', () => {
  const montar = () =>
    new ObtenerDetalleDeMedico(
      new Medicos([medico('a', 'Dra. Mariana Solís')]),
      new Consultas({
        a: [
          c('1', 2026, 9, 28, 'Clínica del Sureste', 'Revisión de presión'),
          c('2', 2026, 7, 14, 'Clínica del Sureste', 'Seguimiento'),
          c('3', 2026, 4, 3, 'Hospital Morelos', 'Primera valoración'),
          c('4', 2026, 1, 10, 'Clínica del Sureste'),
          c('5', 2025, 12, 1),
        ],
      }),
    );

  it('devuelve null si el médico no existe', async () => {
    expect(await montar().ejecutar('fantasma')).toBeNull();
  });

  it('cuenta consultas, última visita y los lugares donde lo atendió (más frecuente primero)', async () => {
    const d = await montar().ejecutar('a');
    expect(d?.consultas).toBe(5);
    expect(d?.ultimaVisita).toEqual(new Date(2026, 8, 28));
    expect(d?.lugares).toEqual([
      { nombre: 'Clínica del Sureste', consultas: 3 },
      { nombre: 'Hospital Morelos', consultas: 1 },
    ]);
  });

  it('trae las 3 consultas más recientes', async () => {
    const d = await montar().ejecutar('a');
    expect(d?.recientes.map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('un médico sin consultas tiene todo en cero y vacío', async () => {
    const uc = new ObtenerDetalleDeMedico(new Medicos([medico('a', 'Dr. Nuevo')]), new Consultas());
    expect(await uc.ejecutar('a')).toMatchObject({ consultas: 0, ultimaVisita: undefined, lugares: [], recientes: [] });
  });
});

describe('ResumenDePerfil', () => {
  it('cuenta médicos, consultas y recetas (consultas que tienen receta)', async () => {
    const r = await new ResumenDePerfil(
      new Medicos([medico('a', 'A'), medico('b', 'B')]),
      new Consultas({ a: [c('1', 2026, 1, 1), c('2', 2026, 1, 2)], b: [c('3', 2026, 1, 3)] }, 2),
    ).ejecutar();
    expect(r).toEqual({ medicos: 2, consultas: 3, recetas: 2 });
  });

  it('sin datos devuelve ceros', async () => {
    expect(await new ResumenDePerfil(new Medicos([]), new Consultas()).ejecutar()).toEqual({ medicos: 0, consultas: 0, recetas: 0 });
  });
});

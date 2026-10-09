import { describe, expect, it } from 'vitest';

import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { ResumenDePerfil } from './ResumenDePerfil';

/** Cuenta cuántas veces se lee el repositorio de consultas: cada lectura cuesta una pasada por toda la colección. */
class ConsultasContadas implements ConsultasDeMedicosRepository {
  lecturas = 0;
  async resumenPorMedico() {
    this.lecturas++;
    return new Map();
  }
  async resumenBasicoPorMedico() {
    this.lecturas++;
    return new Map();
  }
  async deMedico() {
    this.lecturas++;
    return [];
  }
  async totales() {
    this.lecturas++;
    return { consultas: 9, conReceta: 4 };
  }
}

const medicos = { listar: async () => [{ id: 'a' }, { id: 'b' }] as Medico[] } as unknown as MedicosRepository;

describe('ResumenDePerfil', () => {
  it('junta médicos, consultas y recetas', async () => {
    expect(await new ResumenDePerfil(medicos, new ConsultasContadas()).ejecutar()).toEqual({ medicos: 2, consultas: 9, recetas: 4 });
  });

  it('lee las consultas una sola vez (no una pasada por dato)', async () => {
    const consultas = new ConsultasContadas();
    await new ResumenDePerfil(medicos, consultas).ejecutar();
    expect(consultas.lecturas).toBe(1);
  });
});

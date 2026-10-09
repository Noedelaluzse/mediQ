import { describe, expect, it } from 'vitest';

import type { GuardadoDeRecetaRepository } from '../domain/GuardadoDeRecetaRepository';
import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RecordatorioDeToma } from '../domain/Toma';
import { GuardarReceta } from './GuardarReceta';

/**
 * AUD-03 / F064: la receta, su marca `hasPrescription` y sus recordatorios se guardan en UNA sola operación (`GuardadoDeRecetaRepository`).
 * Antes eran dos pasos seguidos: si el segundo fallaba, quedaba la receta nueva con los recordatorios viejos.
 */
const ahora = new Date(2026, 9, 6, 14, 0);
const med = (nombre: string, extra: Record<string, unknown> = {}) => ({ nombre, dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', via: 'Oral', recordar: true, primeraToma: '08:00', ...extra });

/** Los puertos de dos pasos NO deben usarse para escribir cuando hay guardado atómico: si se llaman, la prueba falla. */
class RecetasSoloLectura implements RecetaRepository {
  constructor(public guardada: Medicamento[] = []) {}
  async obtener() {
    return [...this.guardada];
  }
  async guardar(): Promise<void> {
    throw new Error('no debe usarse: el guardado va por el puerto atómico');
  }
  async quitar(): Promise<void> {
    throw new Error('no debe usarse: el guardado va por el puerto atómico');
  }
}
const recordatoriosIntocables: RecordatoriosDeTomaRepository = {
  listar: async () => [],
  reemplazarDe: async () => {
    throw new Error('no debe usarse: el guardado va por el puerto atómico');
  },
  quitarDe: async () => undefined,
};

class Atomico implements GuardadoDeRecetaRepository {
  llamadas: { consultaId: string; medicamentos: Medicamento[]; recordatorios: RecordatorioDeToma[] }[] = [];
  falla = false;
  async guardar(consultaId: string, medicamentos: Medicamento[], recordatorios: RecordatorioDeToma[]) {
    if (this.falla) throw new Error('operación rechazada');
    this.llamadas.push({ consultaId, medicamentos, recordatorios });
  }
}

class Registro implements Pick<RegistroDeTomasRepository, 'tomadasDesde' | 'quitarDeMedicamento'> {
  quitados: string[] = [];
  async tomadasDesde() {
    return [];
  }
  async quitarDeMedicamento(consultaId: string, medicamentoId: string) {
    this.quitados.push(`${consultaId}/${medicamentoId}`);
  }
}

const montar = (previa: Medicamento[] = []) => {
  const recetas = new RecetasSoloLectura(previa);
  const atomico = new Atomico();
  const registro = new Registro();
  let n = 0;
  const caso = new GuardarReceta(recetas, recordatoriosIntocables, () => ahora, () => `id${++n}`, registro, atomico);
  return { caso, atomico, registro };
};

describe('GuardarReceta con guardado atómico (AUD-03)', () => {
  it('guarda la receta y sus recordatorios con UNA sola llamada, con las identidades finales', async () => {
    const { caso, atomico } = montar();
    const r = await caso.ejecutar('c1', [med('A'), med('B', { recordar: false }), med('C')]);
    expect(r.ok).toBe(true);
    expect(atomico.llamadas).toHaveLength(1);
    const [{ consultaId, medicamentos, recordatorios }] = atomico.llamadas;
    expect(consultaId).toBe('c1');
    expect(medicamentos.map((m) => m.nombre)).toEqual(['A', 'B', 'C']);
    expect(medicamentos.every((m) => m.id)).toBe(true);
    // solo los que tienen aviso, y cada recordatorio lleva el id y la posición de SU medicamento
    expect(recordatorios.map((x) => [x.medicamentoId, x.indice])).toEqual([[medicamentos[0].id, 0], [medicamentos[2].id, 2]]);
  });

  it('vaciar la receta es la misma operación con listas vacías (quita la receta y todos sus recordatorios)', async () => {
    const { caso, atomico } = montar([{ id: 'x', nombre: 'A' }]);
    const r = await caso.ejecutar('c1', []);
    expect(r.ok).toBe(true);
    expect(atomico.llamadas).toEqual([{ consultaId: 'c1', medicamentos: [], recordatorios: [] }]);
  });

  it('si el guardado atómico falla, el error sube, no se anuncia éxito y no se borra ninguna marca', async () => {
    const { caso, atomico, registro } = montar([{ id: 'x', nombre: 'Viejo', recordar: true, recordarDesde: ahora }]);
    atomico.falla = true;
    await expect(caso.ejecutar('c1', [med('Nuevo')])).rejects.toThrow('operación rechazada');
    expect(registro.quitados).toEqual([]);
  });

  it('una receta inválida no llega al guardado: no se escribe nada', async () => {
    const { caso, atomico } = montar();
    const r = await caso.ejecutar('c1', [med('')]);
    expect(r.ok).toBe(false);
    expect(atomico.llamadas).toEqual([]);
  });

  it('las marcas de los medicamentos que salen se borran DESPUÉS de guardar (no antes ni a medias)', async () => {
    const { caso, atomico, registro } = montar([{ id: 'sale', nombre: 'Sale', recordar: true, recordarDesde: ahora }]);
    await caso.ejecutar('c1', [med('Entra')]);
    expect(atomico.llamadas).toHaveLength(1);
    expect(registro.quitados).toEqual(['c1/sale']);
  });
});

describe('GuardarReceta sin guardado atómico inyectado (modo simulado y pruebas sencillas)', () => {
  it('conserva la composición de dos pasos: guarda la receta y reemplaza los recordatorios', async () => {
    const guardadas: Medicamento[][] = [];
    const reemplazos: RecordatorioDeToma[][] = [];
    const recetas: RecetaRepository = { obtener: async () => [], guardar: async (_c, m) => void guardadas.push(m), quitar: async () => undefined };
    const recordatorios: RecordatoriosDeTomaRepository = { listar: async () => [], reemplazarDe: async (_c, r) => void reemplazos.push(r), quitarDe: async () => undefined };
    await new GuardarReceta(recetas, recordatorios, () => ahora).ejecutar('c1', [med('A')]);
    expect(guardadas).toHaveLength(1);
    expect(reemplazos).toHaveLength(1);
    expect(reemplazos[0][0].medicamento).toBe('A');
  });
});

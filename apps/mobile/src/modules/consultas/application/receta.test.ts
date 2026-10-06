import { describe, expect, it } from 'vitest';

import { DemasiadosMedicamentosError, MedicamentoInvalidoError } from '../domain/errors';
import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { GuardarReceta } from './GuardarReceta';
import { ObtenerReceta } from './ObtenerReceta';

class Repo implements RecetaRepository {
  porConsulta = new Map<string, Medicamento[]>();
  async obtener(consultaId: string) {
    return [...(this.porConsulta.get(consultaId) ?? [])];
  }
  async guardar(consultaId: string, medicamentos: Medicamento[]) {
    this.porConsulta.set(consultaId, medicamentos);
  }
  async quitar(consultaId: string) {
    this.porConsulta.delete(consultaId);
  }
}

const sinRecordatorios: RecordatoriosDeTomaRepository = { listar: async () => [], reemplazarDe: async () => undefined, quitarDe: async () => undefined };
const nuevoGuardar = (repo: RecetaRepository) => new GuardarReceta(repo, sinRecordatorios, () => new Date(2026, 9, 6, 12, 0));

describe('GuardarReceta', () => {
  it('guarda los medicamentos de la consulta y los devuelve ya normalizados', async () => {
    const repo = new Repo();
    const r = await nuevoGuardar(repo).ejecutar('c1', [{ nombre: ' Losartán ', dosis: '50 mg' }, { nombre: 'Aspirina' }]);
    expect(r.ok && r.value.map((m) => m.nombre)).toEqual(['Losartán', 'Aspirina']);
    expect((await repo.obtener('c1'))[0]).toMatchObject({ nombre: 'Losartán', dosis: '50 mg' });
  });

  it('guardar de nuevo reemplaza la receta anterior', async () => {
    const repo = new Repo();
    const uc = nuevoGuardar(repo);
    await uc.ejecutar('c1', [{ nombre: 'Losartán' }, { nombre: 'Aspirina' }]);
    await uc.ejecutar('c1', [{ nombre: 'Paracetamol' }]);
    expect((await repo.obtener('c1')).map((m) => m.nombre)).toEqual(['Paracetamol']);
  });

  it('una lista vacía quita la receta', async () => {
    const repo = new Repo();
    const uc = nuevoGuardar(repo);
    await uc.ejecutar('c1', [{ nombre: 'Losartán' }]);
    const r = await uc.ejecutar('c1', []);
    expect(r.ok).toBe(true);
    expect(repo.porConsulta.has('c1')).toBe(false);
  });

  it('si algo es inválido no guarda nada', async () => {
    const repo = new Repo();
    const uc = nuevoGuardar(repo);
    await uc.ejecutar('c1', [{ nombre: 'Losartán' }]);
    const r = await uc.ejecutar('c1', [{ nombre: 'Aspirina' }, { nombre: '  ' }]);
    expect(!r.ok && r.error).toBeInstanceOf(MedicamentoInvalidoError);
    expect((await repo.obtener('c1')).map((m) => m.nombre)).toEqual(['Losartán']);
  });

  it('rechaza más de 20 medicamentos', async () => {
    const r = await nuevoGuardar(new Repo()).ejecutar('c1', Array.from({ length: 21 }, (_, n) => ({ nombre: `M${n}` })));
    expect(!r.ok && r.error).toBeInstanceOf(DemasiadosMedicamentosError);
  });
});

describe('ObtenerReceta', () => {
  it('devuelve los medicamentos en el orden guardado, y vacío si no hay receta', async () => {
    const repo = new Repo();
    await nuevoGuardar(repo).ejecutar('c1', [{ nombre: 'B' }, { nombre: 'A' }]);
    const uc = new ObtenerReceta(repo);
    expect((await uc.ejecutar('c1')).map((m) => m.nombre)).toEqual(['B', 'A']);
    expect(await uc.ejecutar('otra')).toEqual([]);
  });
});

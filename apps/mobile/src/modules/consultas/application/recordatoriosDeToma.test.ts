import { describe, expect, it } from 'vitest';

import { PREFIJO_DE_TOMAS, type RecordatorioDeToma } from '../domain/Toma';
import type { EstadoDelPermiso, ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { AvisoLocal } from '../domain/AvisoLocal';
import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { GuardarReceta } from './GuardarReceta';
import { SincronizarAvisosDeTomas } from './SincronizarAvisosDeTomas';

class Recetas implements RecetaRepository {
  porConsulta = new Map<string, Medicamento[]>();
  async obtener(c: string) {
    return [...(this.porConsulta.get(c) ?? [])];
  }
  async guardar(c: string, m: Medicamento[]) {
    this.porConsulta.set(c, m);
  }
  async quitar(c: string) {
    this.porConsulta.delete(c);
  }
}

class Recordatorios implements RecordatoriosDeTomaRepository {
  porConsulta = new Map<string, RecordatorioDeToma[]>();
  async listar() {
    return [...this.porConsulta.values()].flat();
  }
  async reemplazarDe(c: string, r: RecordatorioDeToma[]) {
    if (r.length === 0) this.porConsulta.delete(c);
    else this.porConsulta.set(c, r);
  }
  async quitarDe(c: string) {
    this.porConsulta.delete(c);
  }
}

class Programador implements ProgramadorDeAvisos {
  porPrefijo = new Map<string, AvisoLocal[]>();
  constructor(public concedido = true) {}
  async permiso(): Promise<EstadoDelPermiso> {
    return { concedido: this.concedido, puedePreguntar: true };
  }
  async pedirPermiso(): Promise<EstadoDelPermiso> {
    return this.permiso();
  }
  async reemplazar(avisos: AvisoLocal[], prefijo: string) {
    this.porConsulta(prefijo, avisos);
  }
  private porConsulta(prefijo: string, avisos: AvisoLocal[]) {
    this.porPrefijo.set(prefijo, avisos);
  }
  async programar() {}
  async cancelar() {}
  async idsPendientes() {
    return [];
  }
  async cancelarTodos() {
    this.porPrefijo.clear();
  }
}

const sinTomas = { registrar: async () => undefined, tomadasDesde: async () => [] as { tomaId: string; tomadaEn: Date }[],
  deshacer: async () => undefined };
const ahora = new Date(2026, 9, 6, 14, 0);
const med = (extra: Partial<Medicamento> = {}): Medicamento => ({ nombre: 'Losartán', dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', via: 'Oral', ...extra });
const conAviso = { recordar: true, primeraToma: '08:00' };

describe('GuardarReceta con recordatorios de toma (RF-32)', () => {
  it('al guardar un medicamento con aviso, deja su recordatorio con «desde» = ahora', async () => {
    const recordatorios = new Recordatorios();
    const r = await new GuardarReceta(new Recetas(), recordatorios, () => ahora).ejecutar('c1', [{ ...med(), ...conAviso }]);
    expect(r.ok).toBe(true);
    const [rec] = await recordatorios.listar();
    expect(rec).toMatchObject({ consultaId: 'c1', indice: 0, medicamento: 'Losartán', dosis: '1 tableta', frecuencia: 'Cada 8 horas', primeraToma: '08:00', desde: ahora });
    expect(rec.hasta).toEqual(new Date(ahora.getTime() + 7 * 86_400_000));
  });

  it('el medicamento guardado conserva la marca y el inicio (para editarlo después)', async () => {
    const recetas = new Recetas();
    await new GuardarReceta(recetas, new Recordatorios(), () => ahora).ejecutar('c1', [{ ...med(), ...conAviso }]);
    expect((await recetas.obtener('c1'))[0]).toMatchObject({ recordar: true, primeraToma: '08:00', recordarDesde: ahora });
  });

  it('volver a guardar conserva el inicio original (los días no se reinician al editar)', async () => {
    const recetas = new Recetas();
    const recordatorios = new Recordatorios();
    await new GuardarReceta(recetas, recordatorios, () => ahora).ejecutar('c1', [{ ...med(), ...conAviso }]);
    const despues = new Date(2026, 9, 8, 10, 0);
    await new GuardarReceta(recetas, recordatorios, () => despues).ejecutar('c1', [{ ...med({ dosis: '2 tabletas' }), ...conAviso, primeraToma: '09:00', recordarDesde: ahora }]);
    const [rec] = await recordatorios.listar();
    expect(rec).toMatchObject({ desde: ahora, primeraToma: '09:00', dosis: '2 tabletas' });
  });

  it('si el medicamento ya no tenía aviso y ahora sí, empieza ahora', async () => {
    const recetas = new Recetas();
    const recordatorios = new Recordatorios();
    await new GuardarReceta(recetas, recordatorios, () => ahora).ejecutar('c1', [med()]);
    expect(await recordatorios.listar()).toEqual([]);
    const despues = new Date(2026, 9, 8, 10, 0);
    await new GuardarReceta(recetas, recordatorios, () => despues).ejecutar('c1', [{ ...med(), ...conAviso }]);
    expect((await recordatorios.listar())[0].desde).toEqual(despues);
  });

  it('quitar el aviso, quitar el medicamento o vaciar la receta borra sus recordatorios', async () => {
    const recetas = new Recetas();
    const recordatorios = new Recordatorios();
    const guardar = new GuardarReceta(recetas, recordatorios, () => ahora);
    await guardar.ejecutar('c1', [{ ...med(), ...conAviso }]);
    await guardar.ejecutar('c1', [med()]);
    expect(await recordatorios.listar()).toEqual([]);
    await guardar.ejecutar('c1', [{ ...med(), ...conAviso }]);
    await guardar.ejecutar('c1', []);
    expect(await recordatorios.listar()).toEqual([]);
    expect(recetas.porConsulta.has('c1')).toBe(false);
  });

  it('una receta inválida no toca nada (ni receta ni recordatorios)', async () => {
    const recordatorios = new Recordatorios();
    const recetas = new Recetas();
    await new GuardarReceta(recetas, recordatorios, () => ahora).ejecutar('c1', [{ ...med(), ...conAviso }]);
    const r = await new GuardarReceta(recetas, recordatorios, () => ahora).ejecutar('c1', [{ ...med({ frecuencia: 'Solo si hay dolor o fiebre' }), ...conAviso }]);
    expect(r.ok).toBe(false);
    expect((await recordatorios.listar()).length).toBe(1);
    expect((await recetas.obtener('c1'))[0].frecuencia).toBe('Cada 8 horas');
  });

  it('varios medicamentos: cada uno con su índice y solo los que tienen aviso', async () => {
    const recordatorios = new Recordatorios();
    await new GuardarReceta(new Recetas(), recordatorios, () => ahora).ejecutar('c1', [med({ nombre: 'A' }), { ...med({ nombre: 'B' }), ...conAviso }, { ...med({ nombre: 'C' }), ...conAviso, primeraToma: '21:00' }]);
    expect((await recordatorios.listar()).map((r) => [r.indice, r.medicamento])).toEqual([[1, 'B'], [2, 'C']]);
  });
});

describe('SincronizarAvisosDeTomas', () => {
  const rec = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
    consultaId: 'c1',
    indice: 0,
    medicamento: 'Losartán',
    dosis: '1 tableta',
    frecuencia: 'Cada 12 horas',
    primeraToma: '08:00',
    desde: new Date(2026, 9, 6, 7, 0),
    hasta: new Date(2026, 9, 8, 7, 0),
    ...extra,
  });

  it('con permiso programa los avisos de toma futuros, cada uno con su insistencia (4 tomas = 8 avisos)', async () => {
    const recordatorios = new Recordatorios();
    await recordatorios.reemplazarDe('c1', [rec()]);
    const p = new Programador();
    const r = await new SincronizarAvisosDeTomas(recordatorios, p, sinTomas, () => new Date(2026, 9, 6, 6, 0)).ejecutar();
    expect(r).toEqual({ estado: 'sincronizados', cantidad: 8 });
    expect(p.porPrefijo.get(PREFIJO_DE_TOMAS)?.map((a) => a.cuerpo)).toEqual(Array(8).fill('Losartán · 1 tableta'));
  });

  it('sin permiso no programa nada', async () => {
    const recordatorios = new Recordatorios();
    await recordatorios.reemplazarDe('c1', [rec()]);
    const p = new Programador(false);
    expect(await new SincronizarAvisosDeTomas(recordatorios, p, sinTomas, () => ahora).ejecutar()).toEqual({ estado: 'sin-permiso' });
    expect(p.porPrefijo.size).toBe(0);
  });

  it('un tratamiento terminado deja la lista vacía (cancela los avisos viejos)', async () => {
    const recordatorios = new Recordatorios();
    await recordatorios.reemplazarDe('c1', [rec()]);
    const p = new Programador();
    const r = await new SincronizarAvisosDeTomas(recordatorios, p, sinTomas, () => new Date(2026, 9, 20)).ejecutar();
    expect(r).toEqual({ estado: 'sincronizados', cantidad: 0 });
    expect(p.porPrefijo.get(PREFIJO_DE_TOMAS)).toEqual([]);
  });
});

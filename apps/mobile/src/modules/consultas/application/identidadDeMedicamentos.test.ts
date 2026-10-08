import { describe, expect, it } from 'vitest';

import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RecordatorioDeToma } from '../domain/Toma';
import { GuardarReceta } from './GuardarReceta';

/**
 * AUD-01 / F062, decisiones del usuario (2026-10-08): cambiar el NOMBRE de un medicamento con dosis ya marcadas = medicamento nuevo
 * (nueva identidad, el tratamiento empieza de nuevo); corregir el nombre mientras NO haya dosis marcadas (error de dedo) y cambiar
 * dosis, frecuencia o duración = el mismo medicamento (misma identidad y mismo inicio). La identidad es un id propio del medicamento, no su posición en la receta.
 */
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

class Registro implements RegistroDeTomasRepository {
  tomas: { tomaId: string; tomadaEn: Date }[] = [];
  fallar = false;
  async registrar(t: TomaRegistrada) {
    this.tomas.push({ tomaId: t.tomaId, tomadaEn: t.tomadaEn });
  }
  async tomadasDesde(fecha: Date) {
    if (this.fallar) throw new Error('sin red');
    return this.tomas.filter((t) => t.tomadaEn.getTime() >= fecha.getTime());
  }
  async deshacer() {}
}

const t0 = new Date(2026, 9, 6, 14, 0);
const t1 = new Date(2026, 9, 8, 10, 0);
const med = (nombre: string, extra: Record<string, unknown> = {}) => ({ nombre, dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', via: 'Oral', recordar: true, primeraToma: '08:00', ...extra });

const montar = () => {
  const recetas = new Recetas();
  const recordatorios = new Recordatorios();
  let n = 0;
  const generarId = () => `id${++n}`;
  const registro = new Registro();
  const guardar = (ahora: Date) => new GuardarReceta(recetas, recordatorios, () => ahora, generarId, registro);
  /** Marca como tomada una dosis del medicamento (con el id que tendría su toma). */
  const marcarToma = (consultaId: string, medicamentoId: string, tomadaEn: Date) => registro.registrar({ tomaId: `toma-${consultaId}-${medicamentoId}-202610061600`, consultaId, indice: 0, medicamento: 'x', programadaPara: tomadaEn, tomadaEn });
  return { recetas, recordatorios, guardar, registro, marcarToma };
};

describe('GuardarReceta: identidad de los medicamentos (AUD-01)', () => {
  it('cada medicamento nuevo recibe su propio id, distinto de los demás, y el recordatorio lo lleva', async () => {
    const { recetas, recordatorios, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A'), med('B')]);
    const [a, b] = await recetas.obtener('c1');
    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect((await recordatorios.listar()).map((r) => [r.medicamentoId, r.indice])).toEqual([[a.id, 0], [b.id, 1]]);
  });

  it('cambiar dosis, frecuencia o duración (mismo nombre) es el MISMO tratamiento: misma identidad y mismo inicio', async () => {
    const { recetas, recordatorios, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [antes] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('A', { id: antes.id, dosis: '2 tabletas', frecuencia: 'Cada 12 horas', duracion: '10 días', recordarDesde: t0 })]);
    const [despues] = await recetas.obtener('c1');
    expect(despues.id).toBe(antes.id);
    expect(despues.recordarDesde).toEqual(t0);
    expect((await recordatorios.listar())[0]).toMatchObject({ medicamentoId: antes.id, desde: t0, dosis: '2 tabletas' });
  });

  it('cambiar el NOMBRE con dosis ya marcadas es un medicamento nuevo: otra identidad y el tratamiento empieza ahora', async () => {
    const { recetas, recordatorios, guardar, marcarToma } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [antes] = await recetas.obtener('c1');
    await marcarToma('c1', antes.id as string, new Date(2026, 9, 6, 16, 2));
    await guardar(t1).ejecutar('c1', [med('B', { id: antes.id, recordarDesde: t0 })]);
    const [despues] = await recetas.obtener('c1');
    expect(despues.id).not.toBe(antes.id);
    expect(despues.recordarDesde).toEqual(t1);
    expect((await recordatorios.listar())[0]).toMatchObject({ medicamentoId: despues.id, desde: t1 });
  });

  it('corregir el NOMBRE (error de dedo) mientras no se haya marcado ninguna dosis es el MISMO medicamento: conserva identidad e inicio', async () => {
    const { recetas, recordatorios, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('Paracetamo')]);
    const [antes] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('Paracetamol', { id: antes.id, recordarDesde: t0 })]);
    const [despues] = await recetas.obtener('c1');
    expect(despues.nombre).toBe('Paracetamol');
    expect(despues.id).toBe(antes.id);
    expect(despues.recordarDesde).toEqual(t0);
    expect(await recordatorios.listar()).toHaveLength(1);
    expect((await recordatorios.listar())[0]).toMatchObject({ medicamentoId: antes.id, medicamento: 'Paracetamol', desde: t0 });
  });

  it('las dosis marcadas de OTRO medicamento (u otra consulta) no cuentan para decidir si el nombre se puede corregir', async () => {
    const { recetas, guardar, marcarToma } = montar();
    await guardar(t0).ejecutar('c1', [med('A'), med('B')]);
    const [a, b] = await recetas.obtener('c1');
    await marcarToma('c1', b.id as string, new Date(2026, 9, 6, 16, 2));
    await marcarToma('c2', a.id as string, new Date(2026, 9, 6, 16, 2));
    await guardar(t1).ejecutar('c1', [med('A corregido', { id: a.id, recordarDesde: t0 }), med('B', { id: b.id, recordarDesde: t0 })]);
    expect((await recetas.obtener('c1'))[0].id).toBe(a.id);
  });

  it('si no se puede saber si hay dosis marcadas (sin red), se asume que sí: medicamento nuevo, nunca se hereda nada por error', async () => {
    const { recetas, guardar, registro } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [antes] = await recetas.obtener('c1');
    registro.fallar = true;
    const r = await guardar(t1).ejecutar('c1', [med('B', { id: antes.id, recordarDesde: t0 })]);
    expect(r.ok).toBe(true);
    expect((await recetas.obtener('c1'))[0].id).not.toBe(antes.id);
  });

  it('sin el registro de tomas (no inyectado) el nombre cambiado cuenta como medicamento nuevo: lo conservador', async () => {
    const recetas = new Recetas();
    const recordatorios = new Recordatorios();
    let n = 0;
    const g = new GuardarReceta(recetas, recordatorios, () => t0, () => `id${++n}`);
    await g.ejecutar('c1', [med('A')]);
    const [antes] = await recetas.obtener('c1');
    await g.ejecutar('c1', [med('B', { id: antes.id, recordarDesde: t0 })]);
    expect((await recetas.obtener('c1'))[0].id).not.toBe(antes.id);
  });

  it('un medicamento sin aviso nunca tuvo tomas: corregir su nombre conserva la identidad', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [{ nombre: 'Aspirin' }]);
    const [antes] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [{ id: antes.id, nombre: 'Aspirina' }]);
    expect((await recetas.obtener('c1'))[0]).toMatchObject({ id: antes.id, nombre: 'Aspirina' });
  });

  it('quitar el primero de tres NO reinicia a los demás: conservan su id y su inicio aunque cambien de posición', async () => {
    const { recetas, recordatorios, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A'), med('B'), med('C')]);
    const [, b, c] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('B', { id: b.id, recordarDesde: t0 }), med('C', { id: c.id, recordarDesde: t0 })]);
    const despues = await recetas.obtener('c1');
    expect(despues.map((m) => m.id)).toEqual([b.id, c.id]);
    expect(despues.map((m) => m.recordarDesde)).toEqual([t0, t0]);
    expect((await recordatorios.listar()).map((r) => [r.medicamentoId, r.indice, r.desde])).toEqual([[b.id, 0, t0], [c.id, 1, t0]]);
  });

  it('reordenar conserva la identidad de cada medicamento', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A'), med('B')]);
    const [a, b] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('B', { id: b.id, recordarDesde: t0 }), med('A', { id: a.id, recordarDesde: t0 })]);
    expect((await recetas.obtener('c1')).map((m) => [m.nombre, m.id])).toEqual([['B', b.id], ['A', a.id]]);
  });

  it('sustituir A por B en la misma fila (borrar y escribir otro) da una identidad nueva: no hereda nada de A', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [a] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('B')]); // fila nueva: sin id
    const [b] = await recetas.obtener('c1');
    expect(b.id).not.toBe(a.id);
  });

  it('un id que no es de esta receta no se respeta (el cliente no inventa identidades) y un id repetido se corrige', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [a] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [med('X', { id: 'ajeno' }), med('A', { id: a.id, recordarDesde: t0 }), med('A', { id: a.id, recordarDesde: t0 })]);
    const ids = (await recetas.obtener('c1')).map((m) => m.id);
    expect(ids[0]).not.toBe('ajeno');
    expect(ids[1]).toBe(a.id);
    expect(ids[2]).not.toBe(a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('un medicamento sin aviso también lleva id (la receta siempre guarda identidad)', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [{ nombre: 'Aspirina' }]);
    expect((await recetas.obtener('c1'))[0].id).toBeTruthy();
  });

  it('apagar el aviso y volver a encenderlo reinicia el inicio, pero la identidad es la misma', async () => {
    const { recetas, guardar } = montar();
    await guardar(t0).ejecutar('c1', [med('A')]);
    const [a] = await recetas.obtener('c1');
    await guardar(t1).ejecutar('c1', [{ nombre: 'A', id: a.id }]);
    await guardar(t1).ejecutar('c1', [med('A', { id: a.id })]);
    const [despues] = await recetas.obtener('c1');
    expect(despues.id).toBe(a.id);
    expect(despues.recordarDesde).toEqual(t1);
  });
});

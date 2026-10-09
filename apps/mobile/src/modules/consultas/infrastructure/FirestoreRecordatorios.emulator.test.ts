/// <reference types="node" />
// Integración REAL: recordatorios de toma (medicationSchedules) con las reglas reales. Requiere emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GuardarReceta } from '../application/GuardarReceta';
import { SincronizarAvisosDeTomas } from '../application/SincronizarAvisosDeTomas';
import type { AvisoLocal } from '../domain/AvisoLocal';
import type { RecordatorioDeToma } from '../domain/Toma';
import { generarId } from '@/shared/kernel/generarId';
import { FirestoreGuardadoDeReceta } from './FirestoreGuardadoDeReceta';
import { FirestoreRegistroDeTomasRepository } from './FirestoreRegistroDeTomasRepository';
import { FirestoreRecetaRepository } from './FirestoreRecetaRepository';
import { FirestoreRecordatoriosDeTomaRepository } from './FirestoreRecordatoriosDeTomaRepository';
import { sembrarConsentimientos, sembrarConsultas, CUENTAS_DE_PRUEBA } from '@/shared/testing/consentimientos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const desde = new Date(Date.now() - 3_600_000);
const rec = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId: 'c1',
  indice: 0,
  medicamentoId: 'mA',
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde,
  hasta: new Date(desde.getTime() + 7 * 86_400_000),
  ...extra,
});

describe.skipIf(!hayEmulador)('Recordatorios de toma contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-recordatorios',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    // Desde F031 las reglas piden el consentimiento aceptado para escribir consultas: se deja listo en las cuentas de prueba.
    await sembrarConsentimientos(entorno);
    // F041: los recordatorios y las tomas apuntan a una consulta que debe existir.
    await sembrarConsultas(entorno, CUENTAS_DE_PRUEBA, ['c1', 'c2', 'c9']);
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const repo = (uid: string) => new FirestoreRecordatoriosDeTomaRepository(db(uid), async () => uid);

  it('reemplazar escribe los recordatorios de la consulta y listar los devuelve', async () => {
    const r = repo('t1');
    await r.reemplazarDe('c1', [rec(), rec({ indice: 1, medicamentoId: 'mB', medicamento: 'Aspirina', dosis: undefined, primeraToma: '21:00' })]);
    const lista = await r.listar();
    expect(lista.map((x) => x.medicamento).sort()).toEqual(['Aspirina', 'Losartán']);
    expect(lista.find((x) => x.medicamento === 'Losartán')).toMatchObject({ consultaId: 'c1', indice: 0, dosis: '1 tableta', frecuencia: 'Cada 8 horas', primeraToma: '08:00' });
    expect(lista.find((x) => x.medicamento === 'Aspirina')?.dosis).toBeUndefined();
  });

  it('reemplazar de nuevo quita los anteriores de esa consulta y no toca los de otra', async () => {
    const r = repo('t2');
    await r.reemplazarDe('c1', [rec(), rec({ indice: 1, medicamentoId: 'mB', medicamento: 'Aspirina' })]);
    await r.reemplazarDe('c2', [rec({ consultaId: 'c2', medicamentoId: 'mM', medicamento: 'Metformina' })]);
    await r.reemplazarDe('c1', [rec({ medicamento: 'Paracetamol' })]);
    expect((await r.listar()).map((x) => x.medicamento).sort()).toEqual(['Metformina', 'Paracetamol']);
  });

  it('la identidad es el medicamento (AUD-01): al quitar otro o reordenar no se duplica ni se mezcla nada', async () => {
    const r = repo('t9');
    await r.reemplazarDe('c1', [rec(), rec({ indice: 1, medicamentoId: 'mB', medicamento: 'Aspirina' })]);
    // Se quitó el primero: Aspirina pasó a la posición 0 y conserva su identidad.
    await r.reemplazarDe('c1', [rec({ indice: 0, medicamentoId: 'mB', medicamento: 'Aspirina' })]);
    const lista = await r.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ consultaId: 'c1', medicamentoId: 'mB', indice: 0, medicamento: 'Aspirina' });
  });

  it('el documento se llama {consulta}_{idDelMedicamento} y las reglas lo aceptan con itemIndex solo para ordenar', async () => {
    await repo('t8').reemplazarDe('c1', [rec({ indice: 3, medicamentoId: 'mZ' })]);
    const { getDoc } = await import('firebase/firestore');
    const d = await getDoc(doc(db('t8'), 'mediq_users/t8/medicationSchedules/c1_mZ'));
    expect(d.exists()).toBe(true);
    expect(d.data()).toMatchObject({ visitId: 'c1', itemIndex: 3, medicationName: 'Losartán' });
  });

  it('quitarDe borra los de esa consulta; con lista vacía también', async () => {
    const r = repo('t3');
    await r.reemplazarDe('c1', [rec()]);
    await r.reemplazarDe('c2', [rec({ consultaId: 'c2' })]);
    await r.quitarDe('c1');
    expect((await r.listar()).map((x) => x.consultaId)).toEqual(['c2']);
    await r.reemplazarDe('c2', []);
    expect(await r.listar()).toEqual([]);
  });

  it('cada usuario ve solo los suyos', async () => {
    await repo('t4').reemplazarDe('c1', [rec()]);
    expect(await repo('t5').listar()).toEqual([]);
  });

  it('guardar una receta con aviso deja el recordatorio y la sincronización programa los avisos (flujo completo con reglas reales)', async () => {
    const uid = 't6';
    const recetas = new FirestoreRecetaRepository(db(uid), async () => uid);
    const recordatorios = repo(uid);
    const r = await new GuardarReceta(recetas, recordatorios, () => desde, generarId, undefined, new FirestoreGuardadoDeReceta(db(uid), async () => uid)).ejecutar('c9', [
      { nombre: 'Losartán', dosis: '1 tableta', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00' },
    ]);
    expect(r.ok).toBe(true);
    expect((await recetas.obtener('c9'))[0]).toMatchObject({ recordar: true, primeraToma: '08:00' });
    expect((await recordatorios.listar())[0]).toMatchObject({ consultaId: 'c9', medicamento: 'Losartán' });

    const programados: AvisoLocal[] = [];
    const programador = {
      permiso: async () => ({ concedido: true, puedePreguntar: true }),
      pedirPermiso: async () => ({ concedido: true, puedePreguntar: true }),
      reemplazar: async (avisos: AvisoLocal[]) => void programados.push(...avisos),
      programar: async () => undefined,
      cancelar: async () => undefined,
      idsPendientes: async () => [],
      cancelarTodos: async () => undefined,
    };
    const s = await new SincronizarAvisosDeTomas(recordatorios, programador, new FirestoreRegistroDeTomasRepository(db(uid), async () => uid), () => desde).ejecutar();
    expect(s.estado === 'sincronizados' && s.cantidad).toBeGreaterThan(0);
    expect(programados[0].cuerpo).toBe('Losartán · 1 tableta');
  });

  it('quitar la receta borra su recordatorio y la sincronización deja sin avisos (flujo completo con reglas reales, F050)', async () => {
    const uid = 't7';
    const recetas = new FirestoreRecetaRepository(db(uid), async () => uid);
    const recordatorios = repo(uid);
    const guardar = new GuardarReceta(recetas, recordatorios, () => desde, generarId, undefined, new FirestoreGuardadoDeReceta(db(uid), async () => uid));
    await guardar.ejecutar('c9', [{ nombre: 'Losartán', dosis: '1 tableta', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00' }]);
    expect(await recordatorios.listar()).toHaveLength(1);

    const sincronizaciones: number[] = [];
    const programador = {
      permiso: async () => ({ concedido: true, puedePreguntar: true }),
      pedirPermiso: async () => ({ concedido: true, puedePreguntar: true }),
      reemplazar: async (avisos: AvisoLocal[]) => void sincronizaciones.push(avisos.length),
      programar: async () => undefined,
      cancelar: async () => undefined,
      idsPendientes: async () => [],
      cancelarTodos: async () => undefined,
    };
    const sincronizar = new SincronizarAvisosDeTomas(recordatorios, programador, new FirestoreRegistroDeTomasRepository(db(uid), async () => uid), () => desde);
    await sincronizar.ejecutar();
    expect(sincronizaciones[0]).toBeGreaterThan(0);

    const quitada = await guardar.ejecutar('c9', []);
    expect(quitada.ok).toBe(true);
    expect(await recetas.obtener('c9')).toEqual([]);
    expect(await recordatorios.listar()).toEqual([]);
    await sincronizar.ejecutar();
    expect(sincronizaciones[1]).toBe(0);
  });

  describe('reglas de medicationSchedules', () => {
    const ruta = (uid: string, id = 'c1_0') => `mediq_users/${uid}/medicationSchedules/${id}`;
    const valido = () => ({
      visitId: 'c1',
      itemIndex: 0,
      medicationName: 'Losartán',
      dose: '1 tableta',
      frequency: 'Cada 8 horas',
      firstDoseTime: '08:00',
      startsAt: Timestamp.fromDate(desde),
      endsAt: Timestamp.fromDate(new Date(desde.getTime() + 86_400_000)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    it('acepta el documento del modelo y deja borrarlo', async () => {
      const ref = doc(db('r1'), ruta('r1'));
      await assertSucceeds(setDoc(ref, valido()));
      await assertSucceeds(deleteDoc(ref));
    });

    it('rechaza campos extra, hora mal formada, índice fuera de rango, fechas invertidas y tipos erróneos', async () => {
      const ref = doc(db('r2'), ruta('r2'));
      await assertFails(setDoc(ref, { ...valido(), extra: 1 }));
      await assertFails(setDoc(ref, { ...valido(), firstDoseTime: '8:00' }));
      await assertFails(setDoc(ref, { ...valido(), firstDoseTime: '25:00' }));
      await assertFails(setDoc(ref, { ...valido(), itemIndex: 20 }));
      await assertFails(setDoc(ref, { ...valido(), itemIndex: -1 }));
      await assertFails(setDoc(ref, { ...valido(), medicationName: '' }));
      await assertFails(setDoc(ref, { ...valido(), frequency: 7 }));
      await assertFails(setDoc(ref, { ...valido(), endsAt: Timestamp.fromDate(new Date(desde.getTime() - 1000)) }));
      await assertFails(setDoc(ref, { ...valido(), startsAt: 'hoy' }));
    });

    it('otro usuario no puede escribir ni borrar', async () => {
      await setDoc(doc(db('r3'), ruta('r3')), valido());
      await assertFails(setDoc(doc(db('intruso'), ruta('r3', 'x_0')), valido()));
      await assertFails(deleteDoc(doc(db('intruso'), ruta('r3'))));
    });
  });
});

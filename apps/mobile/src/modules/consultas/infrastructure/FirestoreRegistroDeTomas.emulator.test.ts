/// <reference types="node" />
// Integración REAL: registro de tomas (doseLogs) con las reglas reales. Requiere emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import { FirestoreRegistroDeTomasRepository } from './FirestoreRegistroDeTomasRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const ahora = new Date();
const toma = (extra: Partial<TomaRegistrada> = {}): TomaRegistrada => ({
  tomaId: 'toma-c1-0-202610060800',
  consultaId: 'c1',
  indice: 0,
  medicamento: 'Losartán',
  dosis: '1 tableta',
  programadaPara: new Date(ahora.getTime() - 120_000),
  tomadaEn: ahora,
  ...extra,
});

describe.skipIf(!hayEmulador)('Registro de tomas contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-registro-de-tomas',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const repo = (uid: string) => new FirestoreRegistroDeTomasRepository(db(uid), async () => uid);

  it('registrar guarda la dosis y tomadasDesde devuelve su id y la hora real', async () => {
    const r = repo('d1');
    await r.registrar(toma());
    const [t] = await r.tomadasDesde(new Date(ahora.getTime() - 60_000));
    expect(t.tomaId).toBe('toma-c1-0-202610060800');
    expect(t.tomadaEn.getTime()).toBe(ahora.getTime());
  });

  it('deshacer borra la dosis; deshacer una que no existe no falla', async () => {
    const r = repo('d6');
    await r.registrar(toma());
    await r.deshacer('toma-c1-0-202610060800');
    expect(await r.tomadasDesde(new Date(ahora.getTime() - 60_000))).toEqual([]);
    await expect(r.deshacer('no-existe')).resolves.toBeUndefined();
  });

  it('otro usuario no puede deshacer mis dosis', async () => {
    await repo('d7').registrar(toma());
    await assertFails(deleteDoc(doc(db('intruso'), 'mediq_users/d7/doseLogs/toma-c1-0-202610060800')));
  });

  it('tomadasDesde no devuelve las tomadas antes de la fecha', async () => {
    const r = repo('d2');
    await r.registrar(toma({ tomadaEn: new Date(ahora.getTime() - 3 * 86_400_000) }));
    expect(await r.tomadasDesde(new Date(ahora.getTime() - 86_400_000))).toEqual([]);
  });

  it('registrar dos veces la misma dosis no falla ni duplica (tocar el botón dos veces)', async () => {
    const r = repo('d3');
    await r.registrar(toma());
    await r.registrar(toma());
    expect(await r.tomadasDesde(new Date(ahora.getTime() - 60_000))).toHaveLength(1);
  });

  it('cada usuario ve solo lo suyo', async () => {
    await repo('d4').registrar(toma());
    expect(await repo('d5').tomadasDesde(new Date(ahora.getTime() - 60_000))).toEqual([]);
  });

  describe('reglas de doseLogs', () => {
    const ruta = (uid: string, id = 'toma-c1-0-202610060800') => `mediq_users/${uid}/doseLogs/${id}`;
    const valido = () => ({
      visitId: 'c1',
      itemIndex: 0,
      medicationName: 'Losartán',
      dose: '1 tableta',
      scheduledFor: Timestamp.fromDate(new Date(ahora.getTime() - 120_000)),
      takenAt: Timestamp.fromDate(ahora),
      createdAt: serverTimestamp(),
    });

    it('acepta el documento del modelo, deja leerlo y borrarlo', async () => {
      const ref = doc(db('r1'), ruta('r1'));
      await assertSucceeds(setDoc(ref, valido()));
      await assertSucceeds(getDoc(ref));
      await assertSucceeds(deleteDoc(ref));
    });

    it('rechaza campos extra, índice fuera de rango, nombre vacío y fechas con tipo erróneo', async () => {
      const ref = doc(db('r2'), ruta('r2'));
      await assertFails(setDoc(ref, { ...valido(), extra: 1 }));
      await assertFails(setDoc(ref, { ...valido(), itemIndex: 20 }));
      await assertFails(setDoc(ref, { ...valido(), itemIndex: -1 }));
      await assertFails(setDoc(ref, { ...valido(), medicationName: '' }));
      await assertFails(setDoc(ref, { ...valido(), takenAt: 'ahora' }));
      await assertFails(setDoc(ref, { ...valido(), scheduledFor: 5 }));
    });

    it('otro usuario no puede leer, escribir ni borrar', async () => {
      await setDoc(doc(db('r3'), ruta('r3')), valido());
      await assertFails(getDoc(doc(db('intruso'), ruta('r3'))));
      await assertFails(setDoc(doc(db('intruso'), ruta('r3', 'otra')), valido()));
      await assertFails(deleteDoc(doc(db('intruso'), ruta('r3'))));
    });
  });
});

/// <reference types="node" />
// Integración REAL contra el emulador de Firestore con las reglas reales. Se omite sin emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from './FirestoreConsultasDeMedicosRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Consultas por médico contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-consultas',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const v = (id: string, datos: object) => setDoc(doc(db, `mediq_users/u1/visits/${id}`), datos);
      await v('v1', { doctorId: 'a', placeName: 'Clínica', reason: 'Revisión', visitedAt: Timestamp.fromDate(new Date(2026, 8, 28)), deletedAt: null });
      await v('v2', { doctorId: 'a', placeName: 'Clínica', visitedAt: Timestamp.fromDate(new Date(2026, 6, 14)) });
      await v('v3', { doctorId: 'a', visitedAt: Timestamp.fromDate(new Date(2026, 3, 3)), deletedAt: Timestamp.now() });
      await v('v4', { doctorId: 'b', visitedAt: Timestamp.fromDate(new Date(2026, 8, 2)), deletedAt: null });
    });
  });

  afterAll(async () => {
    await entorno?.cleanup();
  });

  const repo = (uid: string) =>
    new FirestoreConsultasDeMedicosRepository(entorno.authenticatedContext(uid).firestore() as unknown as Firestore, async () => uid);

  it('resume por médico ignorando las consultas borradas', async () => {
    const r = await repo('u1').resumenPorMedico();
    expect(r.get('a')).toEqual({ consultas: 2, ultimaVisita: new Date(2026, 8, 28), lugares: ['Clínica'] });
    expect(r.get('b')).toEqual({ consultas: 1, ultimaVisita: new Date(2026, 8, 2), lugares: [] });
  });

  it('lista las consultas de un médico, la más reciente primero', async () => {
    const r = await repo('u1').deMedico('a');
    expect(r.map((x) => x.id)).toEqual(['v1', 'v2']);
    expect(r[0]).toMatchObject({ lugar: 'Clínica', motivo: 'Revisión' });
  });

  it('cuenta todas las consultas vigentes', async () => {
    expect(await repo('u1').contarTodas()).toBe(3);
  });

  it('otro usuario no ve nada', async () => {
    expect((await repo('u2').resumenPorMedico()).size).toBe(0);
    expect(await repo('u2').contarTodas()).toBe(0);
  });
});

/// <reference types="node" />
// F068 (AUD-08): si el servidor no puede hacer la consulta (índice sin crear o construyéndose), todo sigue dando el resultado correcto
// con el recorrido de antes. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from './FirestoreConsultasDeMedicosRepository';

// Todas las agregaciones y las consultas de «la última visita» fallan como falla Firestore sin su índice: `failed-precondition`.
vi.mock('firebase/firestore', async (original) => {
  const sdk = await original<typeof import('firebase/firestore')>();
  const sinIndice = () => Promise.reject(Object.assign(new Error('The query requires an index'), { code: 'failed-precondition' }));
  return { ...sdk, getCountFromServer: sinIndice };
});

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Respaldo cuando el servidor no puede contar', () => {
  let entorno: RulesTestEnvironment;
  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-respaldo-conteos',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const visita = (id: string, extra: object) =>
        setDoc(doc(db, `mediq_users/r1/visits/${id}`), { patientId: 'self', specialty: 'cardiologia', visitType: 'especialista', visitMode: 'presencial', visitedAt: Timestamp.fromDate(new Date(2026, 5, 1)), deletedAt: null, ...extra });
      await visita('c1', { doctorId: 'a', hasPrescription: true });
      await visita('c2', { doctorId: 'a', hasPrescription: false });
      await visita('c3', { doctorId: 'b', hasPrescription: true, deletedAt: Timestamp.now() });
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const repo = () => new FirestoreConsultasDeMedicosRepository(entorno.authenticatedContext('r1').firestore() as unknown as Firestore, async () => 'r1');

  it('totales sigue dando el resultado correcto recorriendo las consultas', async () => {
    expect(await repo().totales()).toEqual({ consultas: 2, conReceta: 1 });
  });

  it('el resumen básico por médico sigue dando el resultado correcto recorriendo las consultas', async () => {
    const r = await repo().resumenBasicoPorMedico(['a', 'b']);
    expect(r.get('a')?.consultas).toBe(2);
    expect(r.has('b')).toBe(false);
  });
});

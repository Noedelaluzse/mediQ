/// <reference types="node" />
// Integración REAL: la próxima cita contra el emulador con reglas reales. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreProximaCitaRepository } from './FirestoreProximaCitaRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const DIA = 86_400_000;

describe.skipIf(!hayEmulador)('Próxima cita contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-proxima',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const visita = (id: string, extra: object) =>
        setDoc(doc(db, `mediq_users/u1/visits/${id}`), { patientId: 'self', specialty: 'cardiologia', visitType: 'especialista', visitMode: 'presencial', visitedAt: Timestamp.fromDate(new Date(Date.now() - 30 * DIA)), deletedAt: null, ...extra });
      await visita('lejana', { nextAppointmentAt: Timestamp.fromDate(new Date(Date.now() + 40 * DIA)), doctorName: 'Dr. Lejano' });
      await visita('cercana', { nextAppointmentAt: Timestamp.fromDate(new Date(Date.now() + 5 * DIA)), doctorName: 'Dra. Cercana' });
      await visita('pasada', { nextAppointmentAt: Timestamp.fromDate(new Date(Date.now() - 2 * DIA)) });
      await visita('borrada', { nextAppointmentAt: Timestamp.fromDate(new Date(Date.now() + 1 * DIA)), deletedAt: Timestamp.now() });
      await visita('sinCita', {});
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const repo = (uid: string) => new FirestoreProximaCitaRepository(entorno.authenticatedContext(uid).firestore() as unknown as Firestore, async () => uid);

  it('trae las futuras de la más cercana a la más lejana, sin pasadas ni borradas', async () => {
    const r = await repo('u1').posterioresA(new Date());
    expect(r.map((c) => c.consultaId)).toEqual(['cercana', 'lejana']);
    expect(r[0].medicoNombre).toBe('Dra. Cercana');
  });

  it('con una fecha más adelante ya no trae las que quedaron atrás', async () => {
    const r = await repo('u1').posterioresA(new Date(Date.now() + 10 * DIA));
    expect(r.map((c) => c.consultaId)).toEqual(['lejana']);
  });

  it('otro usuario no ve nada', async () => {
    expect(await repo('u2').posterioresA(new Date())).toEqual([]);
  });
});

/// <reference types="node" />
// Integración REAL: el diario paginado contra el emulador con las reglas reales. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreDiarioRepository } from './FirestoreDiarioRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Diario contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-diario',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      // 25 consultas vigentes, una por día (la 1 es la más antigua), y una borrada en medio.
      for (let n = 1; n <= 25; n++) {
        await setDoc(doc(db, `mediq_users/u1/visits/v${String(n).padStart(2, '0')}`), {
          patientId: 'self',
          specialty: 'cardiologia',
          visitType: 'especialista',
          visitMode: 'presencial',
          visitedAt: Timestamp.fromDate(new Date(2026, 8, n, 10, 0)),
          doctorName: `Dr. ${n}`,
          deletedAt: null,
        });
      }
      await setDoc(doc(db, 'mediq_users/u1/visits/borrada'), {
        patientId: 'self',
        specialty: 'otra',
        visitType: 'otro',
        visitMode: 'presencial',
        visitedAt: Timestamp.fromDate(new Date(2026, 8, 30, 10, 0)),
        deletedAt: Timestamp.now(),
      });
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const repo = (uid: string) => new FirestoreDiarioRepository(entorno.authenticatedContext(uid).firestore() as unknown as Firestore, async () => uid);

  it('la primera página trae 20, de la más reciente a la más antigua, sin las borradas', async () => {
    const p = await repo('u1').pagina();
    expect(p.consultas).toHaveLength(20);
    expect(p.consultas[0].medicoNombre).toBe('Dr. 25');
    expect(p.consultas[19].medicoNombre).toBe('Dr. 6');
    expect(p.consultas.some((c) => c.id === 'borrada')).toBe(false);
    expect(p.siguiente).toBeDefined();
  });

  it('la segunda página trae las 5 restantes y ya no hay más', async () => {
    const r = repo('u1');
    const p1 = await r.pagina();
    const p2 = await r.pagina(p1.siguiente);
    expect(p2.consultas.map((c) => c.medicoNombre)).toEqual(['Dr. 5', 'Dr. 4', 'Dr. 3', 'Dr. 2', 'Dr. 1']);
    expect(p2.siguiente).toBeUndefined();
  });

  it('otro usuario no ve nada', async () => {
    expect((await repo('u2').pagina()).consultas).toEqual([]);
  });
});

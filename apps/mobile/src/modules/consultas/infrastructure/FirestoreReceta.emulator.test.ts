/// <reference types="node" />
// Integración REAL: receta (medicamentos) de una consulta y sus reglas. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GuardarReceta } from '../application/GuardarReceta';
import { ObtenerReceta } from '../application/ObtenerReceta';
import { FirestoreRecetaRepository } from './FirestoreRecetaRepository';
import { FirestoreConsultasDeMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository';
import { FirestoreRecordatoriosDeTomaRepository } from './FirestoreRecordatoriosDeTomaRepository';
import { sembrarConsentimientos } from '@/shared/testing/consentimientos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Receta contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-receta',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    // Desde F031 las reglas piden el consentimiento aceptado para escribir consultas: se deja listo en las cuentas de prueba.
    await sembrarConsentimientos(entorno);
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const visitaDe = (extra: Record<string, unknown> = {}) => ({
    patientId: 'self',
    specialty: 'cardiologia',
    visitType: 'especialista',
    visitMode: 'presencial',
    visitedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
    deletedAt: null,
    ...extra,
  });
  /** Crea consultas sin pasar por las reglas (con `extra` se prueba una consulta con o sin marca). */
  const sembrarVisitas = (uid: string, ids: string[], extra: Record<string, unknown> = {}) =>
    entorno.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore() as unknown as Firestore;
      for (const id of ids) await setDoc(doc(admin, `mediq_users/${uid}/visits/${id}`), visitaDe(extra));
    });
  const marcaDe = async (db: Firestore, uid: string, id: string) => (await getDoc(doc(db, `mediq_users/${uid}/visits/${id}`))).data()?.hasPrescription;

  const montar = (uid: string) => {
    const db = entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
    const repo = new FirestoreRecetaRepository(db, async () => uid);
    return { db, guardar: new GuardarReceta(repo, new FirestoreRecordatoriosDeTomaRepository(db, async () => uid), () => new Date()), obtener: new ObtenerReceta(repo) };
  };

  it('guarda varios medicamentos en orden y los lee de vuelta', async () => {
    await sembrarVisitas('r1', ['c1']);
    const { guardar, obtener } = montar('r1');
    const r = await guardar.ejecutar('c1', [{ nombre: 'Losartán', dosis: '50 mg', frecuencia: 'cada 24 h', duracion: '30 días', via: 'Oral', indicaciones: 'Con alimentos' }, { nombre: 'Aspirina' }]);
    expect(r.ok).toBe(true);
    const lista = await obtener.ejecutar('c1');
    expect(lista.map((m) => m.nombre)).toEqual(['Losartán', 'Aspirina']);
    expect(lista[0]).toMatchObject({ dosis: '50 mg', via: 'Oral', indicaciones: 'Con alimentos' });
  });

  it('guardar de nuevo reemplaza; una lista vacía quita la receta', async () => {
    await sembrarVisitas('r2', ['c1']);
    const { guardar, obtener } = montar('r2');
    await guardar.ejecutar('c1', [{ nombre: 'A' }, { nombre: 'B' }]);
    await guardar.ejecutar('c1', [{ nombre: 'C', dosis: '1' }]);
    expect((await obtener.ejecutar('c1')).map((m) => m.nombre)).toEqual(['C']);
    await guardar.ejecutar('c1', []);
    expect(await obtener.ejecutar('c1')).toEqual([]);
  });

  it('una consulta sin receta devuelve lista vacía', async () => {
    expect(await montar('r3').obtener.ejecutar('nada')).toEqual([]);
  });

  it('cada usuario ve solo sus recetas', async () => {
    await sembrarVisitas('r4', ['c1']);
    await montar('r4').guardar.ejecutar('c1', [{ nombre: 'Privado' }]);
    expect(await montar('r5').obtener.ejecutar('c1')).toEqual([]);
  });

  it('las reglas rechazan una receta mal formada (items no lista, más de 20, campos extra)', async () => {
    const { db } = montar('r6');
    const ref = doc(db, 'mediq_users', 'r6', 'visits', 'c1', 'prescriptions', 'receta');
    const ok = { items: [{ name: 'A', remind: false }], createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(ref, ok));
    await assertFails(setDoc(ref, { ...ok, items: 'no soy lista' }));
    await assertFails(setDoc(ref, { ...ok, items: Array.from({ length: 21 }, () => ({ name: 'A', remind: false })) }));
    await assertFails(setDoc(ref, { ...ok, extra: 1 }));
  });

  it('otro usuario no puede escribir en mi receta', async () => {
    const { db } = montar('r8');
    const ajena = doc(db, 'mediq_users', 'r7', 'visits', 'c1', 'prescriptions', 'receta');
    await assertFails(setDoc(ajena, { items: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  });


  describe('marca hasPrescription (F048)', () => {
    it('guardar una receta marca la consulta; una lista vacía la desmarca', async () => {
      await sembrarVisitas('a1', ['a']);
      const { db, guardar } = montar('a1');
      await guardar.ejecutar('a', [{ nombre: 'Losartán' }]);
      expect(await marcaDe(db, 'a1', 'a')).toBe(true);
      await guardar.ejecutar('a', []);
      expect(await marcaDe(db, 'a1', 'a')).toBe(false);
    });

    it('guardar la receta no cambia `updatedAt` de la consulta', async () => {
      await sembrarVisitas('a2', ['a'], { updatedAt: Timestamp.fromDate(new Date(2026, 0, 1)) });
      const { db, guardar } = montar('a2');
      await guardar.ejecutar('a', [{ nombre: 'X' }]);
      const visita = (await getDoc(doc(db, 'mediq_users/a2/visits/a'))).data();
      expect(visita?.updatedAt.toDate()).toEqual(new Date(2026, 0, 1));
    });
  });

  describe('contador de recetas del perfil', () => {
    const visita = (extra: Record<string, unknown> = {}) => ({
      patientId: 'self',
      specialty: 'cardiologia',
      visitType: 'especialista',
      visitMode: 'presencial',
      visitedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
      deletedAt: null,
      ...extra,
    });

    it('cuenta las consultas vigentes que tienen receta; las eliminadas y las sin receta no cuentan', async () => {
      const uid = 'p1';
      const { db, guardar } = montar(uid);
      await entorno.withSecurityRulesDisabled(async (ctx) => {
        const admin = ctx.firestore() as unknown as Firestore;
        for (const id of ['a', 'b', 'c', 'borrada']) await setDoc(doc(admin, `mediq_users/${uid}/visits/${id}`), visita(id === 'borrada' ? { deletedAt: Timestamp.now() } : {}));
      });
      const resumen = new FirestoreConsultasDeMedicosRepository(db, async () => uid);
      expect((await resumen.totales()).conReceta).toBe(0);

      await guardar.ejecutar('a', [{ nombre: 'Losartán' }]);
      await guardar.ejecutar('b', [{ nombre: 'Aspirina' }, { nombre: 'Metformina' }]);
      await guardar.ejecutar('borrada', [{ nombre: 'Fantasma' }]);
      expect((await resumen.totales()).conReceta).toBe(2); // una receta por consulta, sin importar cuántos medicamentos

      await guardar.ejecutar('a', []);
      expect((await resumen.totales()).conReceta).toBe(1);
    });

    it('confía en la marca: no abre la receta de las consultas ya marcadas', async () => {
      const uid = 'p4';
      await sembrarVisitas(uid, ['si'], { hasPrescription: true }); // marcada, y NO existe su receta: solo la marca puede hacerla contar
      await sembrarVisitas(uid, ['no'], { hasPrescription: false });
      const { db } = montar(uid);
      expect(await new FirestoreConsultasDeMedicosRepository(db, async () => uid).totales()).toEqual({ consultas: 2, conReceta: 1 });
    });

    it('una consulta antigua sin marca se cuenta leyendo su receta y se rellena la marca', async () => {
      const uid = 'p5';
      await sembrarVisitas(uid, ['vieja-con', 'vieja-sin']);
      await entorno.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore() as unknown as Firestore, `mediq_users/${uid}/visits/vieja-con/prescriptions/receta`), { items: [{ name: 'A', remind: false }] });
      });
      const { db } = montar(uid);
      const repo = new FirestoreConsultasDeMedicosRepository(db, async () => uid);
      expect(await repo.totales()).toEqual({ consultas: 2, conReceta: 1 });
      expect(await marcaDe(db, uid, 'vieja-con')).toBe(true);
      expect(await marcaDe(db, uid, 'vieja-sin')).toBe(false);
    });

    it('cada usuario cuenta solo las suyas', async () => {
      await sembrarVisitas('p2', ['a']);
      await montar('p2').guardar.ejecutar('a', [{ nombre: 'X' }]);
      const otro = montar('p3');
      expect((await new FirestoreConsultasDeMedicosRepository(otro.db, async () => 'p3').totales()).conReceta).toBe(0);
    });
  });
});

/// <reference types="node" />
// Prueba de integración REAL contra el emulador de Firestore, con las reglas reales de firebase/firestore.rules.
// Se omite sola si no hay emulador. Ejecutar con: pnpm test:emulator
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { claveDeLugar } from '../domain/Lugar';
import { FirestoreLugaresRepository } from './FirestoreLugaresRepository';
import { FirestoreMedicosRepository } from './FirestoreMedicosRepository';
import { sembrarConsentimientos } from '@/shared/testing/consentimientos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

/** Una consulta que cumple las reglas de `visits` (hay que mantenerlas válidas porque renombrar y desvincular las actualizan). */
const visitaValida = {
  patientId: 'self',
  specialty: 'cardiologia',
  visitType: 'especialista',
  visitMode: 'presencial',
  visitedAt: new Date(Date.now() - 86_400_000),
  deletedAt: null,
};

describe.skipIf(!hayEmulador)('Médicos y lugares contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-medicos',
      firestore: {
        host,
        port: Number(puerto),
        rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8'),
      },
    });
    // Desde F031 las reglas piden el consentimiento aceptado para escribir consultas: se deja listo en las cuentas de prueba.
    await sembrarConsentimientos(entorno);
  });

  afterAll(async () => {
    await entorno?.cleanup();
  });

  const dbDe = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const sembrar = (fn: (db: Firestore) => Promise<void>) =>
    entorno.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore() as unknown as Firestore));

  describe('médicos', () => {
    it('guarda, lista, edita y obtiene un médico', async () => {
      const repo = new FirestoreMedicosRepository(dbDe('u1'), async () => 'u1');
      await repo.guardar({ id: 'm1', nombreCompleto: 'Dra. Solís', especialidad: 'cardiologia', telefono: '998' });
      await repo.guardar({ id: 'm1', nombreCompleto: 'Dra. M. Solís', especialidad: 'cardiologia' });

      expect(await repo.listar()).toEqual([{ id: 'm1', nombreCompleto: 'Dra. M. Solís', especialidad: 'cardiologia' }]);
      expect((await repo.obtener('m1'))?.nombreCompleto).toBe('Dra. M. Solís');
      expect(await repo.obtener('nada')).toBeNull();
    });

    it('cada usuario ve solo sus médicos', async () => {
      await new FirestoreMedicosRepository(dbDe('u2'), async () => 'u2').guardar({
        id: 'm1',
        nombreCompleto: 'Dr. De u2',
        especialidad: 'otra',
      });
      const deU3 = new FirestoreMedicosRepository(dbDe('u3'), async () => 'u3');
      expect(await deU3.listar()).toEqual([]);
    });

    it('cuenta solo las consultas vigentes del médico', async () => {
      await sembrar(async (db) => {
        await setDoc(doc(db, 'mediq_users/u4/visits/v1'), { doctorId: 'm1', deletedAt: null });
        await setDoc(doc(db, 'mediq_users/u4/visits/v2'), { doctorId: 'm1' });
        await setDoc(doc(db, 'mediq_users/u4/visits/v3'), { doctorId: 'm1', deletedAt: new Date() });
        await setDoc(doc(db, 'mediq_users/u4/visits/v4'), { doctorId: 'otro', deletedAt: null });
      });
      const repo = new FirestoreMedicosRepository(dbDe('u4'), async () => 'u4');
      expect(await repo.contarConsultas('m1')).toBe(2);
    });

    it('eliminar lo oculta del listado (borrado lógico)', async () => {
      const repo = new FirestoreMedicosRepository(dbDe('u5'), async () => 'u5');
      await repo.guardar({ id: 'm1', nombreCompleto: 'Dr. Borrable', especialidad: 'otra' });
      await repo.eliminar('m1');
      expect(await repo.listar()).toEqual([]);
      expect(await repo.obtener('m1')).toBeNull();
    });
  });

  describe('lugares', () => {
    it('crea, lista y busca por clave sin importar mayúsculas ni acentos', async () => {
      const repo = new FirestoreLugaresRepository(dbDe('p1'), async () => 'p1');
      await repo.crear({ id: 'l1', nombre: 'Clínica del Sureste' });
      expect(await repo.listar()).toEqual([{ id: 'l1', nombre: 'Clínica del Sureste' }]);
      expect((await repo.buscarPorClave(claveDeLugar('clinica DEL sureste')))?.id).toBe('l1');
      expect(await repo.buscarPorClave('no-existe')).toBeNull();
    });

    it('renombrar actualiza el nombre y copia el nuevo nombre a sus consultas', async () => {
      await sembrar(async (db) => {
        await setDoc(doc(db, 'mediq_users/p2/visits/v1'), { ...visitaValida, placeId: 'l1', placeName: 'Hosp. Morelos' });
        await setDoc(doc(db, 'mediq_users/p2/visits/v2'), { ...visitaValida, placeId: 'otro', placeName: 'Otro' });
      });
      const repo = new FirestoreLugaresRepository(dbDe('p2'), async () => 'p2');
      await repo.crear({ id: 'l1', nombre: 'Hosp. Morelos' });
      await repo.renombrar('l1', 'Hospital Morelos');

      expect((await repo.obtener('l1'))?.nombre).toBe('Hospital Morelos');
      expect((await repo.buscarPorClave(claveDeLugar('Hospital Morelos')))?.id).toBe('l1');
      await sembrar(async (db) => {
        expect((await getDoc(doc(db, 'mediq_users/p2/visits/v1'))).data()?.placeName).toBe('Hospital Morelos');
        expect((await getDoc(doc(db, 'mediq_users/p2/visits/v2'))).data()?.placeName).toBe('Otro');
      });
    });

    it('consultasPorLugar cuenta las consultas vigentes de todos los lugares en una sola lectura (F053)', async () => {
      await sembrar(async (db) => {
        await setDoc(doc(db, 'mediq_users/p5/visits/v1'), { ...visitaValida, placeId: 'l1', placeName: 'Clínica' });
        await setDoc(doc(db, 'mediq_users/p5/visits/v2'), { ...visitaValida, placeId: 'l1', placeName: 'Clínica' });
        await setDoc(doc(db, 'mediq_users/p5/visits/v3'), { ...visitaValida, placeId: 'l2', placeName: 'Hospital' });
        await setDoc(doc(db, 'mediq_users/p5/visits/v4'), { ...visitaValida, placeId: 'l1', placeName: 'Clínica', deletedAt: new Date() }); // eliminada: no cuenta
        await setDoc(doc(db, 'mediq_users/p5/visits/v5'), { ...visitaValida }); // sin lugar
      });
      const repo = new FirestoreLugaresRepository(dbDe('p5'), async () => 'p5');
      const cuenta = await repo.consultasPorLugar();
      expect(Object.fromEntries(cuenta)).toEqual({ l1: 2, l2: 1 });
      expect(await repo.contarConsultas('l1')).toBe(2); // coincide con la cuenta de uno en uno
    });

    it('consultasPorLugar solo cuenta las consultas de esa cuenta', async () => {
      const repo = new FirestoreLugaresRepository(dbDe('p6'), async () => 'p6');
      expect((await repo.consultasPorLugar()).size).toBe(0);
    });

    it('eliminar borra el lugar y deja sus consultas sin lugar', async () => {
      await sembrar(async (db) => {
        await setDoc(doc(db, 'mediq_users/p3/visits/v1'), { ...visitaValida, placeId: 'l1', placeName: 'Clínica', reason: 'control' });
      });
      const repo = new FirestoreLugaresRepository(dbDe('p3'), async () => 'p3');
      await repo.crear({ id: 'l1', nombre: 'Clínica' });
      expect(await repo.contarConsultas('l1')).toBe(1);

      await repo.eliminar('l1');

      expect(await repo.obtener('l1')).toBeNull();
      await sembrar(async (db) => {
        const v = (await getDoc(doc(db, 'mediq_users/p3/visits/v1'))).data();
        expect(v?.reason).toBe('control');
        expect(v?.placeId).toBeNull();
        expect(v?.placeName).toBeNull();
      });
    });
  });
});

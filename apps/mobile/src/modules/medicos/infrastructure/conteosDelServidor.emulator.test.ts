/// <reference types="node" />
// F068 (AUD-08): los conteos del servidor dan EXACTAMENTE lo mismo que recorrer todas las consultas. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from './FirestoreConsultasDeMedicosRepository';
import { sembrarConsentimientos } from '@/shared/testing/consentimientos';

import { FirestoreLugaresRepository } from './FirestoreLugaresRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const dia = (n: number) => Timestamp.fromDate(new Date(2026, 5, n, 10, 0));

type Consulta = { id: string; medico?: string; lugar?: string; dia: number; receta?: boolean | 'sin-marca'; borrada?: boolean };

describe.skipIf(!hayEmulador)('Conteos del servidor contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-conteos',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const sembrar = (uid: string, consultas: Consulta[]) =>
    entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      for (const c of consultas) {
        await setDoc(doc(db, `mediq_users/${uid}/visits/${c.id}`), {
          patientId: 'self',
          specialty: 'cardiologia',
          visitType: 'especialista',
          visitMode: 'presencial',
          visitedAt: dia(c.dia),
          ...(c.medico ? { doctorId: c.medico, doctorName: `Dr ${c.medico}` } : {}),
          ...(c.lugar ? { placeId: c.lugar, placeName: `Lugar ${c.lugar}` } : {}),
          ...(c.receta === 'sin-marca' ? {} : { hasPrescription: c.receta === true }),
          deletedAt: c.borrada ? Timestamp.now() : null,
        });
        // Las consultas anteriores a F048 no traen la marca: su receta se descubre abriendo `prescriptions/receta`.
        if (c.receta === 'sin-marca') await setDoc(doc(db, `mediq_users/${uid}/visits/${c.id}/prescriptions/receta`), { items: [{ name: 'A' }] });
      }
    });
  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const consultasDe = (uid: string) => new FirestoreConsultasDeMedicosRepository(db(uid), async () => uid);
  const lugaresDe = (uid: string) => new FirestoreLugaresRepository(db(uid), async () => uid);

  const DATOS: Consulta[] = [
    { id: 'c01', medico: 'a', lugar: 'x', dia: 1, receta: true },
    { id: 'c02', medico: 'a', lugar: 'x', dia: 5, receta: false },
    { id: 'c03', medico: 'a', lugar: 'y', dia: 9, receta: true },
    { id: 'c04', medico: 'b', lugar: 'y', dia: 3, receta: false },
    { id: 'c05', medico: 'b', dia: 20, receta: true },
    { id: 'c06', medico: 'a', lugar: 'x', dia: 25, receta: true, borrada: true }, // la más reciente de «a», pero borrada
    { id: 'c07', medico: 'c', lugar: 'z', dia: 7, receta: false, borrada: true }, // «c» solo tiene una borrada
    { id: 'c08', dia: 11, receta: false }, // sin médico ni lugar
  ];

  it('totales: cuenta solo las vigentes y las que tienen receta, igual que recorrerlas', async () => {
    await sembrar('k1', DATOS);
    expect(await consultasDe('k1').totales()).toEqual({ consultas: 6, conReceta: 3 });
  });

  it('totales: con consultas ANTERIORES sin la marca `hasPrescription` cae al recorrido, da el resultado correcto y rellena la marca', async () => {
    // Para rellenar la marca las reglas piden el perfil propio y el consentimiento aceptado (como en la app).
    await sembrarConsentimientos(entorno, ['k2']);
    await entorno.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore() as unknown as Firestore, 'mediq_users/k2/patients/self'), { fullName: 'Prueba', isSelf: true }));
    await sembrar('k2', [
      { id: 'c01', dia: 1, receta: true },
      { id: 'c02', dia: 2, receta: 'sin-marca' }, // tiene receta pero no marca
      { id: 'c03', dia: 3, receta: false },
    ]);
    expect(await consultasDe('k2').totales()).toEqual({ consultas: 3, conReceta: 2 });
    expect((await getDoc(doc(db('k2'), 'mediq_users/k2/visits/c02'))).data()?.hasPrescription).toBe(true); // se rellenó
  });

  it('totales: sin consultas da ceros', async () => {
    expect(await consultasDe('k3').totales()).toEqual({ consultas: 0, conReceta: 0 });
  });

  it('consultas por lugar: cuenta solo las vigentes de cada lugar (con los ids o sin ellos)', async () => {
    await sembrar('k4', DATOS);
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore() as unknown as Firestore;
      for (const id of ['x', 'y', 'z', 'w']) await setDoc(doc(admin, `mediq_users/k4/places/${id}`), { name: `Lugar ${id}`, nameKey: id, isActive: true });
    });
    const esperado = new Map([['x', 2], ['y', 2]]); // «z» solo tiene una borrada y «w» ninguna: no cuentan
    expect(await lugaresDe('k4').consultasPorLugar(['x', 'y', 'z', 'w'])).toEqual(esperado);
    expect(await lugaresDe('k4').consultasPorLugar()).toEqual(esperado);
  });

  it('resumen básico por médico: consultas vigentes y última visita vigente (la borrada más reciente no cuenta), igual que el recorrido completo', async () => {
    await sembrar('k5', DATOS);
    const repo = consultasDe('k5');
    const basico = await repo.resumenBasicoPorMedico(['a', 'b', 'c', 'd']);
    expect(basico.get('a')).toMatchObject({ consultas: 3, ultimaVisita: dia(9).toDate() });
    expect(basico.get('b')).toMatchObject({ consultas: 2, ultimaVisita: dia(20).toDate() });
    expect(basico.has('c')).toBe(false); // solo tiene una borrada
    expect(basico.has('d')).toBe(false); // no tiene ninguna
    const completo = await repo.resumenPorMedico();
    for (const [id, r] of basico) expect(completo.get(id)).toMatchObject({ consultas: r.consultas, ultimaVisita: r.ultimaVisita });
  });
});

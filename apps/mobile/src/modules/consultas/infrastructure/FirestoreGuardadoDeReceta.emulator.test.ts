/// <reference types="node" />
// Integración REAL (AUD-03 / F064): receta + marca + recordatorios se guardan en UNA operación. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Medicamento } from '../domain/Receta';
import type { RecordatorioDeToma } from '../domain/Toma';
import { FirestoreGuardadoDeReceta } from './FirestoreGuardadoDeReceta';
import { FirestoreRecetaRepository } from './FirestoreRecetaRepository';
import { FirestoreRecordatoriosDeTomaRepository } from './FirestoreRecordatoriosDeTomaRepository';
import { sembrarConsentimientos } from '@/shared/testing/consentimientos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const desde = new Date(Date.now() - 3_600_000);

const med = (id: string, nombre: string): Medicamento => ({ id, nombre, dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00', recordarDesde: desde });
const rec = (consultaId: string, medicamentoId: string, indice: number, extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId,
  medicamentoId,
  indice,
  medicamento: `Med ${medicamentoId}`,
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde,
  hasta: new Date(desde.getTime() + 7 * 86_400_000),
  ...extra,
});

describe.skipIf(!hayEmulador)('Guardado atómico de receta + recordatorios contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-guardado-de-receta',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await sembrarConsentimientos(entorno);
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const visita = () => ({
    patientId: 'self',
    specialty: 'cardiologia',
    visitType: 'especialista',
    visitMode: 'presencial',
    visitedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
    deletedAt: null,
  });
  /** Prepara el perfil propio y las consultas (sin pasar por las reglas). */
  const sembrar = (uid: string, consultas: string[]) =>
    entorno.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(admin, `mediq_users/${uid}/patients/self`), { fullName: 'Prueba', isSelf: true });
      for (const c of consultas) await setDoc(doc(admin, `mediq_users/${uid}/visits/${c}`), visita());
    });
  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const repo = (uid: string) => new FirestoreGuardadoDeReceta(db(uid), async () => uid);
  const items = async (uid: string, c: string) => {
    const s = await getDoc(doc(db(uid), `mediq_users/${uid}/visits/${c}/prescriptions/receta`));
    return s.exists() ? ((s.data()?.items ?? []) as { name: string; id?: string }[]) : null;
  };
  const marca = async (uid: string, c: string) => (await getDoc(doc(db(uid), `mediq_users/${uid}/visits/${c}`))).data()?.hasPrescription;
  const idsDeRecordatorios = async (uid: string) => (await getDocs(collection(db(uid), `mediq_users/${uid}/medicationSchedules`))).docs.map((d) => d.id).sort();

  it('guarda la receta, la marca de la consulta y los recordatorios juntos', async () => {
    await sembrar('a1', ['c1']);
    await repo('a1').guardar('c1', [med('mA', 'A'), med('mB', 'B')], [rec('c1', 'mA', 0), rec('c1', 'mB', 1)]);
    expect((await items('a1', 'c1'))?.map((i) => [i.name, i.id])).toEqual([['A', 'mA'], ['B', 'mB']]);
    expect(await marca('a1', 'c1')).toBe(true);
    expect(await idsDeRecordatorios('a1')).toEqual(['c1_mA', 'c1_mB']);
  });

  it('al guardar de nuevo reemplaza: quita los recordatorios de lo que ya no está y no toca los de otra consulta', async () => {
    await sembrar('a2', ['c1', 'c2']);
    const r = repo('a2');
    await r.guardar('c1', [med('mA', 'A'), med('mB', 'B')], [rec('c1', 'mA', 0), rec('c1', 'mB', 1)]);
    await r.guardar('c2', [med('mZ', 'Z')], [rec('c2', 'mZ', 0)]);
    await r.guardar('c1', [med('mB', 'B')], [rec('c1', 'mB', 0)]);
    expect((await items('a2', 'c1'))?.map((i) => i.id)).toEqual(['mB']);
    expect(await idsDeRecordatorios('a2')).toEqual(['c1_mB', 'c2_mZ']);
  });

  it('con listas vacías quita la receta, baja la marca a false y borra todos los recordatorios de esa consulta', async () => {
    await sembrar('a3', ['c1']);
    const r = repo('a3');
    await r.guardar('c1', [med('mA', 'A')], [rec('c1', 'mA', 0)]);
    await r.guardar('c1', [], []);
    expect(await items('a3', 'c1')).toBeNull();
    expect(await marca('a3', 'c1')).toBe(false);
    expect(await idsDeRecordatorios('a3')).toEqual([]);
  });

  it('limpia recordatorios sueltos de esa consulta que ya no corresponden a ningún medicamento (se autocorrige)', async () => {
    await sembrar('a4', ['c1']);
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(admin, 'mediq_users/a4/medicationSchedules/c1_viejo'), { visitId: 'c1', itemIndex: 0, medicationName: 'Viejo', frequency: 'Cada 8 horas', firstDoseTime: '08:00', startsAt: desde, endsAt: new Date(desde.getTime() + 86_400_000) });
    });
    await repo('a4').guardar('c1', [med('mA', 'A')], [rec('c1', 'mA', 0)]);
    expect(await idsDeRecordatorios('a4')).toEqual(['c1_mA']);
  });

  // La razón de ser de F064: antes eran dos pasos; si el segundo fallaba quedaba la receta nueva con recordatorios viejos.
  it('ATOMICIDAD: si las reglas rechazan UN recordatorio, no cambia NADA (ni receta, ni marca, ni recordatorios)', async () => {
    await sembrar('a5', ['c1']);
    const r = repo('a5');
    await r.guardar('c1', [med('mA', 'Original')], [rec('c1', 'mA', 0)]);
    const antes = { receta: await items('a5', 'c1'), marca: await marca('a5', 'c1'), recordatorios: await idsDeRecordatorios('a5') };

    // La frecuencia de más de 60 caracteres la rechazan las reglas (`recordatorioValido`) aunque la receta sí sería válida.
    const invalido = rec('c1', 'mB', 1, { frecuencia: 'x'.repeat(61) });
    await expect(r.guardar('c1', [med('mB', 'Nuevo')], [invalido])).rejects.toThrow();

    expect({ receta: await items('a5', 'c1'), marca: await marca('a5', 'c1'), recordatorios: await idsDeRecordatorios('a5') }).toEqual(antes);
    expect(antes.receta?.[0].name).toBe('Original');
  });

  it('ATOMICIDAD al quitar: si falla, la receta, la marca y los recordatorios siguen como estaban', async () => {
    await sembrar('a6', ['c1']);
    const r = repo('a6');
    await r.guardar('c1', [med('mA', 'A')], [rec('c1', 'mA', 0)]);
    // La consulta de otra cuenta no existe para a6: la operación entera debe fallar sin dejar nada a medias.
    await expect(r.guardar('noExiste', [], [])).rejects.toThrow();
    expect(await items('a6', 'c1')).not.toBeNull();
    expect(await marca('a6', 'c1')).toBe(true);
    expect(await idsDeRecordatorios('a6')).toEqual(['c1_mA']);
  });

  // La reproducción del hallazgo: así se guardaba antes (receta y, DESPUÉS, recordatorios). Esta prueba documenta el problema que F064 evita.
  it('REPRODUCCIÓN (lo que pasaba con los dos pasos de antes): un rechazo en el segundo paso dejaba la receta nueva con recordatorios viejos', async () => {
    await sembrar('a7', ['c1']);
    const recetas = new FirestoreRecetaRepository(db('a7'), async () => 'a7');
    const recordatorios = new FirestoreRecordatoriosDeTomaRepository(db('a7'), async () => 'a7');
    await recetas.guardar('c1', [med('mA', 'Original')]);
    await recordatorios.reemplazarDe('c1', [rec('c1', 'mA', 0)]);

    await recetas.guardar('c1', [med('mB', 'Nuevo')]); // primer paso: se escribe
    await expect(recordatorios.reemplazarDe('c1', [rec('c1', 'mB', 0, { frecuencia: 'x'.repeat(61) })])).rejects.toThrow(); // segundo paso: rechazado

    expect((await items('a7', 'c1'))?.[0].name).toBe('Nuevo'); // la receta ya cambió...
    expect(await idsDeRecordatorios('a7')).toEqual(['c1_mA']); // ...pero el recordatorio sigue siendo el del medicamento anterior
  });
});


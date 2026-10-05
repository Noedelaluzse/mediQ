/// <reference types="node" />
// Prueba REAL de las reglas de seguridad de `visits` contra el emulador. Se omite sin emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const hoy = () => new Date();
const hace = (ms: number) => new Date(Date.now() - ms);
const en = (ms: number) => new Date(Date.now() + ms);
const DIA = 86_400_000;

const visita = (extra: Record<string, unknown> = {}) => ({
  patientId: 'self',
  specialty: 'cardiologia',
  visitType: 'especialista',
  visitMode: 'presencial',
  visitedAt: hace(DIA),
  deletedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

describe.skipIf(!hayEmulador)('Reglas de Firestore para visits (reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-reglas',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const ruta = (uid: string, id: string) => `mediq_users/${uid}/visits/${id}`;

  it('el dueño crea una consulta válida', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), ruta('u1', 'v1')), visita({ reason: 'Revisión', doctorNotes: 'Bajar la sal', office: '204' })));
  });

  it('acepta consulta con lugar, médico y próxima cita posterior', async () => {
    await assertSucceeds(
      setDoc(doc(db('u1'), ruta('u1', 'v2')), visita({ placeId: 'l1', placeName: 'Clínica', doctorId: 'm1', doctorName: 'Dra. Solís', nextAppointmentAt: en(10 * DIA) })),
    );
  });

  it('rechaza una consulta con fecha futura', async () => {
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v3')), visita({ visitedAt: en(DIA) })));
  });

  it('tolera hasta 5 minutos de adelanto del reloj del teléfono, no más', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), ruta('u1', 'v4')), visita({ visitedAt: en(2 * 60_000) })));
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v5')), visita({ visitedAt: en(30 * 60_000) })));
  });

  it('rechaza una próxima cita anterior o igual a la consulta', async () => {
    const fecha = hace(2 * DIA);
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v6')), visita({ visitedAt: fecha, nextAppointmentAt: hace(3 * DIA) })));
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v7')), visita({ visitedAt: fecha, nextAppointmentAt: fecha })));
  });

  it('rechaza un tipo de médico que no existe', async () => {
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v8')), visita({ visitType: 'brujo' })));
  });

  it('rechaza si falta un campo obligatorio', async () => {
    const { specialty: _omitido, ...sinEspecialidad } = visita();
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v9')), sinEspecialidad));
  });

  it('rechaza campos que no existen en el modelo', async () => {
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v10')), visita({ campoRaro: 'x' })));
  });

  it('rechaza textos con un tipo equivocado', async () => {
    await assertFails(setDoc(doc(db('u1'), ruta('u1', 'v11')), visita({ reason: 123 })));
  });

  it('otro usuario no puede leer ni escribir en las consultas ajenas', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), ruta('u1', 'v12')), visita()));
    await assertFails(setDoc(doc(db('u2'), ruta('u1', 'v13')), visita()));
  });

  it('sin sesión no se puede escribir', async () => {
    const anonimo = entorno.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(setDoc(doc(anonimo, ruta('u1', 'v14')), visita()));
  });

  it('actualizar mantiene las mismas validaciones (no se puede poner fecha futura)', async () => {
    await assertSucceeds(setDoc(doc(db('u3'), ruta('u3', 'v1')), visita()));
    await assertSucceeds(updateDoc(doc(db('u3'), ruta('u3', 'v1')), { reason: 'Corregido', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db('u3'), ruta('u3', 'v1')), { visitedAt: en(DIA) }));
  });

  it('permite el borrado lógico, renombrar el lugar y desvincularlo (flujos de F006/F012)', async () => {
    await assertSucceeds(setDoc(doc(db('u4'), ruta('u4', 'v1')), visita({ placeId: 'l1', placeName: 'Hosp. Morelos' })));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { placeName: 'Hospital Morelos' }));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { placeId: null, placeName: null }));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { deletedAt: serverTimestamp() }));
  });

  it('el dueño puede borrar de verdad (eliminar la cuenta, F005)', async () => {
    await assertSucceeds(setDoc(doc(db('u5'), ruta('u5', 'v1')), visita()));
    await assertSucceeds(deleteDoc(doc(db('u5'), ruta('u5', 'v1'))));
  });

  it('las demás colecciones del usuario siguen funcionando', async () => {
    for (const c of ['patients/self', 'consents/aviso_1', 'places/l1', 'doctors/m1']) {
      await assertSucceeds(setDoc(doc(db('u6'), `mediq_users/u6/${c}`), { x: 1 }));
    }
    await assertSucceeds(setDoc(doc(db('u6'), 'mediq_users/u6'), { email: 'a@b.c' }));
    await assertSucceeds(setDoc(doc(db('u6'), 'mediq_users/u6/visits/v1/instructions/i1'), { body: 'agua' }));
    await assertFails(setDoc(doc(db('u7'), 'mediq_users/u6/doctors/m2'), { x: 1 }));
  });

  it('no se puede escribir fuera de mediq_users', async () => {
    await assertFails(setDoc(doc(db('u1'), 'otra_app/u1'), { x: 1 }));
    void hoy;
  });
});

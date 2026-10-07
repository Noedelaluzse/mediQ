/// <reference types="node" />
// Prueba REAL de las reglas de seguridad de `visits` contra el emulador. Se omite sin emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { aceptarConsentimientos, sembrarConsentimientos, sembrarDocumentos } from '@/shared/testing/consentimientos';

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
    // Desde F031 las reglas piden el consentimiento aceptado para escribir consultas: se deja listo en las cuentas de prueba.
    await sembrarConsentimientos(entorno);
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
    await sembrarDocumentos(entorno, 'u1', { 'places/l1': { name: 'Clínica', nameKey: 'clinica' }, 'doctors/m1': { fullName: 'Dra. Solís', specialty: 'cardiologia', deletedAt: null } });
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
    await sembrarDocumentos(entorno, 'u4', { 'places/l1': { name: 'Hosp. Morelos', nameKey: 'hosp. morelos' } });
    await assertSucceeds(setDoc(doc(db('u4'), ruta('u4', 'v1')), visita({ placeId: 'l1', placeName: 'Hosp. Morelos' })));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { placeName: 'Hospital Morelos' }));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { placeId: null, placeName: null }));
    await assertSucceeds(updateDoc(doc(db('u4'), ruta('u4', 'v1')), { deletedAt: serverTimestamp() }));
  });

  it('el dueño puede borrar de verdad (eliminar la cuenta, F005)', async () => {
    await assertSucceeds(setDoc(doc(db('u5'), ruta('u5', 'v1')), visita()));
    await assertSucceeds(deleteDoc(doc(db('u5'), ruta('u5', 'v1'))));
  });

  it('las demás colecciones del usuario siguen funcionando con documentos válidos (el detalle está en ReglasDeColecciones)', async () => {
    const marca = () => serverTimestamp();
    await assertSucceeds(setDoc(doc(db('z6'), 'mediq_users/z6/patients/self'), { fullName: 'Ana', isSelf: true, createdAt: marca() }));
    // La cuenta z6 no está entre las de prueba con consentimiento sembrado: acepta aviso y términos por el camino real (los recibos
    // son inmutables y la regla de las consultas, F031, pide ambos).
    await assertSucceeds(aceptarConsentimientos(db('z6'), 'z6'));
    await assertSucceeds(setDoc(doc(db('z6'), 'mediq_users/z6/places/l1'), { name: 'Hospital', nameKey: 'hospital', createdAt: marca(), updatedAt: marca() }));
    await assertSucceeds(
      setDoc(doc(db('z6'), 'mediq_users/z6/doctors/m1'), { fullName: 'Dra. Solís', specialty: 'cardiologia', deletedAt: null, createdAt: marca(), updatedAt: marca() }),
    );
    await assertSucceeds(setDoc(doc(db('z6'), 'mediq_users/z6'), { googleSub: 'g', email: 'a@b.c', displayName: 'Ana', createdAt: marca() }));
    await assertSucceeds(setDoc(doc(db('z6'), 'mediq_users/z6/visits/v1/prescriptions/r1'), { items: [], notes: 'x' }));
    await assertSucceeds(setDoc(doc(db('z6'), 'mediq_users/z6/visits/v1/prescriptions/r1/attachments/a1'), { storagePath: 'mediq_users/z6/visits/v1/receta.jpg', mimeType: 'image/jpeg', sizeBytes: 10 }));
    await assertFails(setDoc(doc(db('u7'), 'mediq_users/z6/doctors/m2'), { fullName: 'X', specialty: 'otra', deletedAt: null }));
  });

  it('no se puede escribir fuera de mediq_users', async () => {
    await assertFails(setDoc(doc(db('u1'), 'otra_app/u1'), { x: 1 }));
    void hoy;
  });

  describe('referencias cruzadas (F041)', () => {
    const sembrar = (uid: string, ruta: string, datos: Record<string, unknown>) =>
      entorno.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore() as unknown as Firestore, `mediq_users/${uid}/${ruta}`), datos);
      });
    const medico = { fullName: 'Dra. Solís', specialty: 'cardiologia', deletedAt: null };
    const lugar = { name: 'Clínica', nameKey: 'clinica' };

    it('patientId debe ser un perfil que exista en la cuenta', async () => {
      await assertSucceeds(setDoc(doc(db('p1'), ruta('p1', 'r1')), visita({ patientId: 'self' })));
      await assertFails(setDoc(doc(db('p1'), ruta('p1', 'r2')), visita({ patientId: 'nadie' })));
    });

    it('doctorId debe ser un médico propio que exista (aunque esté dado de baja); el de otra cuenta no vale', async () => {
      await sembrar('p2', 'doctors/m1', medico);
      await sembrar('p2', 'doctors/m2', { ...medico, deletedAt: new Date() });
      await sembrar('p3', 'doctors/m9', medico);
      await assertSucceeds(setDoc(doc(db('p2'), ruta('p2', 'r1')), visita({ doctorId: 'm1', doctorName: 'Dra. Solís' })));
      await assertSucceeds(setDoc(doc(db('p2'), ruta('p2', 'r2')), visita({ doctorId: 'm2', doctorName: 'Dr. Baja' })));
      await assertFails(setDoc(doc(db('p2'), ruta('p2', 'r3')), visita({ doctorId: 'inexistente', doctorName: 'X' })));
      await assertFails(setDoc(doc(db('p2'), ruta('p2', 'r4')), visita({ doctorId: 'm9', doctorName: 'De otra cuenta' })));
    });

    it('placeId debe ser un lugar propio que exista; el de otra cuenta no vale', async () => {
      await sembrar('p4', 'places/l1', lugar);
      await sembrar('p5', 'places/l9', lugar);
      await assertSucceeds(setDoc(doc(db('p4'), ruta('p4', 'r1')), visita({ placeId: 'l1', placeName: 'Clínica' })));
      await assertFails(setDoc(doc(db('p4'), ruta('p4', 'r2')), visita({ placeId: 'inexistente', placeName: 'X' })));
      await assertFails(setDoc(doc(db('p4'), ruta('p4', 'r3')), visita({ placeId: 'l9', placeName: 'De otra cuenta' })));
    });

    it('sin médico ni lugar (o con null) sigue siendo válida', async () => {
      await assertSucceeds(setDoc(doc(db('p6'), ruta('p6', 'r1')), visita({ doctorId: null, placeId: null })));
    });

    it('al editar solo se revisa lo que cambia: una consulta anterior a la regla (lugar ya borrado) se puede seguir editando', async () => {
      await sembrar('p7', 'visits/r1', { patientId: 'self', specialty: 'cardiologia', visitType: 'especialista', visitMode: 'presencial', visitedAt: hace(DIA), placeId: 'borrado', placeName: 'Vieja' });
      await assertSucceeds(updateDoc(doc(db('p7'), ruta('p7', 'r1')), { reason: 'Nueva nota', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db('p7'), ruta('p7', 'r1')), { placeId: 'otro-inexistente', updatedAt: serverTimestamp() }));
    });
  });

  describe('visitId de recordatorios y tomas (F041)', () => {
    const recordatorio = (visitId: string) => ({
      visitId, itemIndex: 0, medicationName: 'Paracetamol', frequency: 'Cada 8 horas', firstDoseTime: '08:00', startsAt: new Date(), endsAt: new Date(Date.now() + DIA),
    });
    const toma = (visitId: string) => ({ visitId, itemIndex: 0, medicationName: 'Paracetamol', scheduledFor: new Date(), takenAt: new Date() });

    it('el recordatorio y la toma deben apuntar a una consulta propia que exista', async () => {
      await entorno.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore() as unknown as Firestore, 'mediq_users/p8/visits/c1'), { patientId: 'self' });
        await setDoc(doc(ctx.firestore() as unknown as Firestore, 'mediq_users/p9/visits/c9'), { patientId: 'self' });
      });
      await assertSucceeds(setDoc(doc(db('p8'), 'mediq_users/p8/medicationSchedules/c1_0'), recordatorio('c1')));
      await assertFails(setDoc(doc(db('p8'), 'mediq_users/p8/medicationSchedules/x_0'), recordatorio('inexistente')));
      await assertFails(setDoc(doc(db('p8'), 'mediq_users/p8/medicationSchedules/c9_0'), recordatorio('c9')));
      await assertSucceeds(setDoc(doc(db('p8'), 'mediq_users/p8/doseLogs/t1'), toma('c1')));
      await assertFails(setDoc(doc(db('p8'), 'mediq_users/p8/doseLogs/t2'), toma('inexistente')));
      await assertFails(setDoc(doc(db('p8'), 'mediq_users/p8/doseLogs/t3'), toma('c9')));
    });
  });

  describe('instructions (F011)', () => {
    const indicacion = (extra: Record<string, unknown> = {}) => ({
      sortOrder: 0,
      body: 'Medir la presión cada mañana',
      doneAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extra,
    });
    const r = (uid: string, id: string) => `mediq_users/${uid}/visits/v1/instructions/${id}`;

    it('el dueño crea una indicación válida', async () => {
      await assertSucceeds(setDoc(doc(db('i1'), r('i1', 'a')), indicacion()));
    });

    it('rechaza texto vacío o de más de 300 caracteres', async () => {
      await assertFails(setDoc(doc(db('i1'), r('i1', 'b')), indicacion({ body: '' })));
      await assertFails(setDoc(doc(db('i1'), r('i1', 'c')), indicacion({ body: 'x'.repeat(301) })));
      await assertSucceeds(setDoc(doc(db('i1'), r('i1', 'd')), indicacion({ body: 'x'.repeat(300) })));
    });

    it('rechaza tipos equivocados y campos que no existen', async () => {
      await assertFails(setDoc(doc(db('i1'), r('i1', 'e')), indicacion({ sortOrder: 'uno' })));
      await assertFails(setDoc(doc(db('i1'), r('i1', 'f')), indicacion({ sortOrder: 1.5 })));
      await assertFails(setDoc(doc(db('i1'), r('i1', 'g')), indicacion({ doneAt: 'ayer' })));
      await assertFails(setDoc(doc(db('i1'), r('i1', 'h')), indicacion({ extra: 1 })));
    });

    it('marcar y desmarcar (doneAt) y quitar funcionan', async () => {
      await assertSucceeds(setDoc(doc(db('i2'), r('i2', 'a')), indicacion()));
      await assertSucceeds(updateDoc(doc(db('i2'), r('i2', 'a')), { doneAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(doc(db('i2'), r('i2', 'a')), { doneAt: null, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db('i2'), r('i2', 'a')), { body: '' }));
      await assertSucceeds(deleteDoc(doc(db('i2'), r('i2', 'a'))));
    });

    it('otro usuario no puede leer ni escribir indicaciones ajenas', async () => {
      await assertSucceeds(setDoc(doc(db('i3'), r('i3', 'a')), indicacion()));
      await assertFails(setDoc(doc(db('i4'), r('i3', 'b')), indicacion()));
    });
  });
});

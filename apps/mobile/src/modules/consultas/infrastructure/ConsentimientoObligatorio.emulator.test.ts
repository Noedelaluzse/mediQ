/// <reference types="node" />
// Prueba REAL de la regla «sin consentimiento aceptado no se escriben consultas» (F031). Requiere emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { aceptarConsentimientos, sembrarPerfilPropio, VERSION_DE_CONSENTIMIENTO_EXIGIDA } from '@/shared/testing/consentimientos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const DIA = 86_400_000;

const visita = (extra: Record<string, unknown> = {}) => ({
  patientId: 'self',
  specialty: 'cardiologia',
  visitType: 'especialista',
  visitMode: 'presencial',
  visitedAt: new Date(Date.now() - DIA),
  deletedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});
const indicacion = (orden: number) => ({ sortOrder: orden, body: `Indicación ${orden}`, doneAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

describe.skipIf(!hayEmulador)('Consentimiento obligatorio para escribir consultas (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-consentimiento',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    // F041: las consultas apuntan al perfil propio, que debe existir.
    await sembrarPerfilPropio(entorno, ['c1', 'c2', 'c3', 'c4a', 'c4b', 'c5', 'c6', 'c7', 'c8', 'c9']);
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const ruta = (uid: string, id: string) => `mediq_users/${uid}/visits/${id}`;

  it('sin ningún consentimiento aceptado, no se puede crear una consulta', async () => {
    await assertFails(setDoc(doc(db('c1'), ruta('c1', 'v1')), visita()));
  });

  it('con el aviso de privacidad y los términos aceptados, sí', async () => {
    await aceptarConsentimientos(db('c2'), 'c2');
    await assertSucceeds(setDoc(doc(db('c2'), ruta('c2', 'v1')), visita()));
  });

  it('con solo uno de los dos aceptado, no', async () => {
    await setDoc(doc(db('c3'), `mediq_users/c3/consents/aviso_privacidad_${VERSION_DE_CONSENTIMIENTO_EXIGIDA}`), { documento: 'aviso_privacidad', version: VERSION_DE_CONSENTIMIENTO_EXIGIDA, acceptedAt: serverTimestamp() });
    await assertFails(setDoc(doc(db('c3'), ruta('c3', 'v1')), visita()));
  });

  it('el consentimiento de otra cuenta no vale', async () => {
    await aceptarConsentimientos(db('c4a'), 'c4a');
    await assertFails(setDoc(doc(db('c4b'), ruta('c4b', 'v1')), visita()));
  });

  it('una versión más nueva aceptada además de la exigida sigue valiendo (subir la versión en la app no rompe nada)', async () => {
    await aceptarConsentimientos(db('c5'), 'c5');
    await aceptarConsentimientos(db('c5'), 'c5', '2027-01-01');
    await assertSucceeds(setDoc(doc(db('c5'), ruta('c5', 'v1')), visita()));
  });

  it('sin consentimiento tampoco se puede editar una consulta existente', async () => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, ruta('c6', 'v1')), visita());
    });
    await assertFails(updateDoc(doc(db('c6'), ruta('c6', 'v1')), { reason: 'x', updatedAt: serverTimestamp() }));
    await aceptarConsentimientos(db('c6'), 'c6');
    await assertSucceeds(updateDoc(doc(db('c6'), ruta('c6', 'v1')), { reason: 'x', updatedAt: serverTimestamp() }));
  });

  it('una consulta con 30 indicaciones en un solo lote se guarda con consentimiento (las lecturas de la regla no pasan el límite)', async () => {
    const conexion = db('c7');
    await aceptarConsentimientos(conexion, 'c7');
    const lote = writeBatch(conexion);
    const v = doc(conexion, ruta('c7', 'v1'));
    lote.set(v, visita());
    for (let i = 0; i < 30; i++) lote.set(doc(collection(v, 'instructions'), `i${i}`), indicacion(i));
    await assertSucceeds(lote.commit());
  });

  it('las indicaciones y la receta de una consulta también exigen consentimiento', async () => {
    await assertFails(setDoc(doc(db('c8'), `${ruta('c8', 'v1')}/instructions/i1`), indicacion(0)));
    await assertFails(setDoc(doc(db('c8'), `${ruta('c8', 'v1')}/prescriptions/receta`), { items: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await aceptarConsentimientos(db('c8'), 'c8');
    await assertSucceeds(setDoc(doc(db('c8'), `${ruta('c8', 'v1')}/instructions/i1`), indicacion(0)));
  });

  it('borrar sí se puede sin consentimiento (eliminar la cuenta debe poder borrarlo todo)', async () => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, ruta('c9', 'v1')), visita());
    });
    await assertSucceeds(deleteDoc(doc(db('c9'), ruta('c9', 'v1'))));
  });
});

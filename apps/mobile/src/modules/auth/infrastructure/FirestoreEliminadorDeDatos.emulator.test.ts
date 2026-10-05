/// <reference types="node" />
// Prueba de integración REAL contra el emulador de Firestore, con las reglas reales de firebase/firestore.rules.
// Se omite sola si no hay emulador. Ejecutar con: pnpm test:emulator
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreEliminadorDeDatos } from './FirestoreEliminadorDeDatos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('FirestoreEliminadorDeDatos contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq',
      firestore: {
        host,
        port: Number(puerto),
        rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await entorno?.cleanup();
  });

  const sembrar = async (uid: string) => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const base = ['mediq_users', uid] as const;
      await setDoc(doc(db, ...base), { email: 'ana@mail.com', displayName: 'Ana', googleSub: 'g' });
      await setDoc(doc(db, ...base, 'patients', 'self'), { fullName: 'Ana', isSelf: true });
      await setDoc(doc(db, ...base, 'consents', 'aviso_privacidad_2026-10-05'), { documento: 'aviso_privacidad', version: '2026-10-05' });
      await setDoc(doc(db, ...base, 'consents', 'terminos_2026-10-05'), { documento: 'terminos', version: '2026-10-05' });
      await setDoc(doc(db, ...base, 'visits', 'v1'), { reason: 'control' });
      await setDoc(doc(db, ...base, 'visits', 'v1', 'instructions', 'i1'), { body: 'agua' });
      await setDoc(doc(db, ...base, 'visits', 'v1', 'prescriptions', 'r1'), { notes: 'x' });
      await setDoc(doc(db, ...base, 'visits', 'v1', 'prescriptions', 'r1', 'attachments', 'a1'), { storagePath: 'p' });
    });
  };

  const contar = async (ruta: string[]) => {
    let total = 0;
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const [primero, ...resto] = ruta;
      total = (await getDocs(collection(db, primero, ...resto))).size;
    });
    return total;
  };

  it('borra el documento del usuario y todo su subárbol, como el propio usuario (con las reglas reales)', async () => {
    await sembrar('u1');
    const db = entorno.authenticatedContext('u1').firestore() as unknown as Firestore;

    await new FirestoreEliminadorDeDatos(db).eliminarTodo('u1');

    expect(await contar(['mediq_users'])).toBe(0);
    for (const sub of ['patients', 'consents', 'visits']) expect(await contar(['mediq_users', 'u1', sub])).toBe(0);
    expect(await contar(['mediq_users', 'u1', 'visits', 'v1', 'instructions'])).toBe(0);
    expect(await contar(['mediq_users', 'u1', 'visits', 'v1', 'prescriptions', 'r1', 'attachments'])).toBe(0);
  });

  it('no toca los datos de otro usuario', async () => {
    await sembrar('u2');
    await sembrar('u3');
    const db = entorno.authenticatedContext('u2').firestore() as unknown as Firestore;

    await new FirestoreEliminadorDeDatos(db).eliminarTodo('u2');

    expect(await contar(['mediq_users', 'u2', 'consents'])).toBe(0);
    expect(await contar(['mediq_users', 'u3', 'consents'])).toBe(2);
  });

  it('las reglas impiden borrar los datos de otra cuenta', async () => {
    await sembrar('u4');
    const intruso = entorno.authenticatedContext('u5').firestore() as unknown as Firestore;

    await expect(new FirestoreEliminadorDeDatos(intruso).eliminarTodo('u4')).rejects.toThrow();
    expect(await contar(['mediq_users', 'u4', 'consents'])).toBe(2);
  });
});

/// <reference types="node" />
// Integración REAL: eliminar la cuenta borra también las fotos de Storage (RNF-07, RF-30). Requiere emuladores.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDocs, collection, setDoc, type Firestore } from 'firebase/firestore';
import { getBytes, ref, uploadString, type FirebaseStorage } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreEliminadorDeDatos } from './FirestoreEliminadorDeDatos';

const hayEmuladores = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST);
const raiz = resolve(__dirname, '../../../../../../firebase');
const JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

describe.skipIf(!hayEmuladores)('Eliminar la cuenta borra las fotos de Storage', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [fh, fp] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    const [sh, sp] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-baja',
      firestore: { host: fh, port: Number(fp), rules: readFileSync(resolve(raiz, 'firestore.rules'), 'utf8') },
      storage: { host: sh, port: Number(sp), rules: readFileSync(resolve(raiz, 'storage.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const sembrarFoto = async (uid: string, consulta: string) => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await uploadString(ref(ctx.storage() as unknown as FirebaseStorage, `mediq_users/${uid}/visits/${consulta}/receta.jpg`), JPEG, 'base64', { contentType: 'image/jpeg' });
    });
  };
  const existe = async (uid: string, consulta: string) => {
    let hay = false;
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      try {
        await getBytes(ref(ctx.storage() as unknown as FirebaseStorage, `mediq_users/${uid}/visits/${consulta}/receta.jpg`));
        hay = true;
      } catch {
        hay = false;
      }
    });
    return hay;
  };

  it('borra los archivos de todas las consultas del usuario y no toca los de otro', async () => {
    await sembrarFoto('b1', 'c1');
    await sembrarFoto('b1', 'c2');
    await sembrarFoto('b2', 'c1');
    const ctx = entorno.authenticatedContext('b1');

    await new FirestoreEliminadorDeDatos(ctx.firestore() as unknown as Firestore, ctx.storage() as unknown as FirebaseStorage).eliminarTodo('b1');

    expect(await existe('b1', 'c1')).toBe(false);
    expect(await existe('b1', 'c2')).toBe(false);
    expect(await existe('b2', 'c1')).toBe(true);
  });

  it('si el usuario no tiene archivos, no falla', async () => {
    const ctx = entorno.authenticatedContext('b3');
    await expect(new FirestoreEliminadorDeDatos(ctx.firestore() as unknown as Firestore, ctx.storage() as unknown as FirebaseStorage).eliminarTodo('b3')).resolves.toBeUndefined();
  });

  // AUD-02 / F063: un id de consulta que solo se conoce por su carpeta en Storage (no hay documento `visits/{id}`) también se limpia.
  it('borra los documentos de una consulta que no existe como documento pero tiene archivo en Storage', async () => {
    await sembrarFoto('b4', 'cfantasma');
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      await setDoc(doc(db, 'mediq_users', 'b4'), { email: 'ana@mail.com', displayName: 'Ana', googleSub: 'g' });
      await setDoc(doc(db, 'mediq_users', 'b4', 'visits', 'cfantasma', 'instructions', 'i1'), { body: 'agua' });
      await setDoc(doc(db, 'mediq_users', 'b4', 'visits', 'cfantasma', 'prescriptions', 'receta', 'attachments', 'foto'), { storagePath: 'p' });
    });
    const quedan = async () => {
      let n = 0;
      await entorno.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore() as unknown as Firestore;
        n += (await getDocs(collection(db, 'mediq_users', 'b4', 'visits', 'cfantasma', 'instructions'))).size;
        n += (await getDocs(collection(db, 'mediq_users', 'b4', 'visits', 'cfantasma', 'prescriptions', 'receta', 'attachments'))).size;
      });
      return n;
    };
    expect(await quedan()).toBe(2);

    const ctx = entorno.authenticatedContext('b4');
    await new FirestoreEliminadorDeDatos(ctx.firestore() as unknown as Firestore, ctx.storage() as unknown as FirebaseStorage).eliminarTodo('b4');

    expect(await quedan()).toBe(0);
    expect(await existe('b4', 'cfantasma')).toBe(false);
  });
});


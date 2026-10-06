/// <reference types="node" />
// Integración REAL: foto de la receta en Storage + Firestore, con las reglas reales. Requiere los emuladores (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { getBytes, ref, uploadString, type FirebaseStorage } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AdjuntarFotoDeReceta } from '../application/AdjuntarFotoDeReceta';
import { ObtenerFotoDeReceta } from '../application/ObtenerFotoDeReceta';
import { QuitarFotoDeReceta } from '../application/QuitarFotoDeReceta';
import type { SelectorDeFoto } from '../domain/SelectorDeFoto';
import { FirestoreFotoDeRecetaRepository } from './FirestoreFotoDeRecetaRepository';

const hayEmuladores = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST);
const raiz = resolve(__dirname, '../../../../../../firebase');
// Un JPEG mínimo válido en base64 (cabecera SOI/EOI): basta para probar subida y bajada.
const JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

describe.skipIf(!hayEmuladores)('Foto de la receta contra los emuladores (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [fh, fp] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    const [sh, sp] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-foto',
      firestore: { host: fh, port: Number(fp), rules: readFileSync(resolve(raiz, 'firestore.rules'), 'utf8') },
      storage: { host: sh, port: Number(sp), rules: readFileSync(resolve(raiz, 'storage.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const montar = (uid: string) => {
    const ctx = entorno.authenticatedContext(uid);
    const db = ctx.firestore() as unknown as Firestore;
    const storage = ctx.storage() as unknown as FirebaseStorage;
    const repo = new FirestoreFotoDeRecetaRepository(db, storage, async () => uid);
    const selector: SelectorDeFoto = { elegir: async () => ({ estado: 'elegida', foto: { base64: JPEG, tipoMime: 'image/jpeg', bytes: 400, ancho: 1, alto: 1 } }) };
    return { db, storage, adjuntar: new AdjuntarFotoDeReceta(selector, repo), obtener: new ObtenerFotoDeReceta(repo), quitar: new QuitarFotoDeReceta(repo) };
  };

  it('adjuntar guarda el archivo en Storage y los datos en Firestore; se puede leer de vuelta', async () => {
    const { adjuntar, obtener, db, storage } = montar('f1');
    const r = await adjuntar.ejecutar('c1', 'galeria');
    expect(r.ok && r.value.estado).toBe('adjuntada');

    const leida = await obtener.ejecutar('c1');
    expect(leida?.foto).toMatchObject({ tipoMime: 'image/jpeg', ancho: 1, alto: 1 });
    expect(leida?.uri).toBe(`data:image/jpeg;base64,${JPEG}`);

    const meta = (await getDoc(doc(db, 'mediq_users/f1/visits/c1/prescriptions/receta/attachments/foto'))).data();
    expect(meta).toMatchObject({ storagePath: 'mediq_users/f1/visits/c1/receta.jpg', mimeType: 'image/jpeg' });
    expect((await getBytes(ref(storage, 'mediq_users/f1/visits/c1/receta.jpg'))).byteLength).toBeGreaterThan(0);
  });

  it('adjuntar de nuevo reemplaza la foto', async () => {
    const { adjuntar, obtener } = montar('f2');
    await adjuntar.ejecutar('c1', 'galeria');
    await adjuntar.ejecutar('c1', 'camara');
    expect((await obtener.ejecutar('c1'))?.foto.bytes).toBeGreaterThan(0);
  });

  it('quitar borra el archivo y el documento; sin foto devuelve null y quitar de nuevo no falla', async () => {
    const { adjuntar, obtener, quitar, storage } = montar('f3');
    await adjuntar.ejecutar('c1', 'galeria');
    await quitar.ejecutar('c1');
    expect(await obtener.ejecutar('c1')).toBeNull();
    await expect(getBytes(ref(storage, 'mediq_users/f3/visits/c1/receta.jpg'))).rejects.toBeTruthy();
    await quitar.ejecutar('c1');
  });

  it('una consulta sin foto devuelve null', async () => {
    expect(await montar('f4').obtener.ejecutar('nada')).toBeNull();
  });

  it('cada usuario ve solo su foto', async () => {
    await montar('f5').adjuntar.ejecutar('c1', 'galeria');
    expect(await montar('f6').obtener.ejecutar('c1')).toBeNull();
  });

  describe('reglas de Storage', () => {
    const ruta = (uid: string) => `mediq_users/${uid}/visits/c1/receta.jpg`;
    const subir = (uid: string, como: string, datos = JPEG, tipo = 'image/jpeg') =>
      uploadString(ref(montar(como).storage, ruta(uid)), datos, 'base64', { contentType: tipo });

    it('el dueño sube y lee; otro usuario no', async () => {
      await assertSucceeds(subir('s1', 's1'));
      await assertSucceeds(getBytes(ref(montar('s1').storage, ruta('s1'))));
      await assertFails(subir('s1', 's2'));
      await assertFails(getBytes(ref(montar('s2').storage, ruta('s1'))));
    });

    it('sin sesión no se puede leer ni escribir', async () => {
      const anonimo = entorno.unauthenticatedContext().storage() as unknown as FirebaseStorage;
      await assertFails(uploadString(ref(anonimo, ruta('s3')), JPEG, 'base64', { contentType: 'image/jpeg' }));
      await assertFails(getBytes(ref(anonimo, ruta('s3'))));
    });

    it('solo imágenes y de hasta 5 MB', async () => {
      await assertFails(subir('s4', 's4', JPEG, 'application/pdf'));
      const grande = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString('base64');
      await assertFails(subir('s4', 's4', grande));
    });

    it('fuera de mediq_users no se escribe', async () => {
      await assertFails(uploadString(ref(montar('s5').storage, 'otra_app/s5/x.jpg'), JPEG, 'base64', { contentType: 'image/jpeg' }));
    });
  });

  describe('reglas de Firestore del adjunto', () => {
    const ruta = (uid: string) => `mediq_users/${uid}/visits/c1/prescriptions/receta/attachments/foto`;
    const valido = () => ({ storagePath: 'mediq_users/a1/visits/c1/receta.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, width: 10, height: 10, createdAt: serverTimestamp() });

    it('acepta el documento del modelo y rechaza campos extra, tipo o tamaño inválidos', async () => {
      const { db } = montar('a1');
      const r = doc(db, ruta('a1'));
      await assertSucceeds(setDoc(r, valido()));
      await assertFails(setDoc(r, { ...valido(), extra: 1 }));
      await assertFails(setDoc(r, { ...valido(), mimeType: 'application/pdf' }));
      await assertFails(setDoc(r, { ...valido(), sizeBytes: 6_000_000 }));
      await assertFails(setDoc(r, { ...valido(), storagePath: 5 }));
    });

    it('otro usuario no puede escribir en mi adjunto', async () => {
      await assertFails(setDoc(doc(montar('a3').db, ruta('a2')), valido()));
    });
  });
});

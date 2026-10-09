/// <reference types="node" />
// Integración REAL: foto de la receta en Storage + Firestore, con las reglas reales. Requiere los emuladores (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { disableNetwork, doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { deleteObject, getBytes, listAll, ref, uploadString, type FirebaseStorage } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AdjuntarFotoDeReceta } from '../application/AdjuntarFotoDeReceta';
import { ObtenerFotoDeReceta } from '../application/ObtenerFotoDeReceta';
import { QuitarFotoDeReceta } from '../application/QuitarFotoDeReceta';
import type { Conectividad } from '@/shared/kernel/Conectividad';

import type { CacheDeFotos } from '../domain/CacheDeFotos';
import type { SelectorDeFoto } from '../domain/SelectorDeFoto';
import { FirestoreFotoDeRecetaRepository } from './FirestoreFotoDeRecetaRepository';
import { prefijoDeCache } from './documentoDeFoto';
import { sembrarConsentimientos } from '@/shared/testing/consentimientos';

const hayEmuladores = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST);
const raiz = resolve(__dirname, '../../../../../../firebase');
// Un JPEG mínimo válido en base64 (cabecera SOI/EOI): basta para probar subida y bajada.
const JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// Otro JPEG válido, distinto del anterior (otro tamaño): sirve para probar que reemplazar la foto invalida la caché.
const JPEG_2 = Buffer.concat([Buffer.from(JPEG, 'base64'), Buffer.from([0xff, 0xd9, 0xff, 0xd9])]).toString('base64');

/** Una caché en memoria que cuenta cuántas veces se bajó y guardó una foto (cada `guardar` es una descarga de Storage). */
class CacheContada implements CacheDeFotos {
  entradas = new Map<string, string>();
  guardados = 0;
  fallar = false;
  async obtener(clave: string) {
    return this.entradas.get(clave) ?? null;
  }
  async guardar(clave: string, bytes: Uint8Array) {
    if (this.fallar) throw new Error('disco lleno');
    this.guardados++;
    const uri = `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
    this.entradas.set(clave, uri);
    return uri;
  }
  async quitarDe(prefijo: string) {
    for (const k of [...this.entradas.keys()]) if (k.startsWith(prefijo)) this.entradas.delete(k);
  }
  async ultimaDe(prefijo: string) {
    const clave = [...this.entradas.keys()].find((k) => k.startsWith(prefijo));
    return clave === undefined ? null : { clave, uri: this.entradas.get(clave) as string };
  }
  async limpiar() {
    this.entradas.clear();
  }
}

/** La red del teléfono, a mano: `conectado = false` simula «modo avión». */
class RedFalsa implements Conectividad {
  conectado = true;
  async estaConectado() {
    return this.conectado;
  }
  suscribir() {
    return () => undefined;
  }
}

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
    // Desde F031 las reglas piden el consentimiento aceptado para escribir consultas: se deja listo en las cuentas de prueba.
    await sembrarConsentimientos(entorno);
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const montar = (uid: string, jpeg: string = JPEG, cache = new CacheContada(), red = new RedFalsa()) => {
    const ctx = entorno.authenticatedContext(uid);
    const db = ctx.firestore() as unknown as Firestore;
    const storage = ctx.storage() as unknown as FirebaseStorage;
    const repo = new FirestoreFotoDeRecetaRepository(db, storage, async () => uid, cache, red);
    const selector: SelectorDeFoto = { elegir: async () => ({ estado: 'elegida', foto: { base64: jpeg, tipoMime: 'image/jpeg', bytes: 400, ancho: 1, alto: 1 } }) };
    return { db, storage, cache, red, repo, adjuntar: new AdjuntarFotoDeReceta(selector, repo), obtener: new ObtenerFotoDeReceta(repo), quitar: new QuitarFotoDeReceta(repo) };
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

  it('obtener usa la ruta propia de la consulta y no el storagePath guardado: una ruta manipulada se ignora (F038)', async () => {
    const { storage } = montar('f7');
    await uploadString(ref(storage, 'mediq_users/f7/visits/c1/receta.jpg'), JPEG, 'base64', { contentType: 'image/jpeg' });
    // Un documento con la ruta de otro usuario (solo se puede sembrar saltándose las reglas, que ya lo rechazan).
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'mediq_users/f7/visits/c1/prescriptions/receta/attachments/foto'), {
        storagePath: 'mediq_users/otro/visits/c1/receta.jpg', mimeType: 'image/jpeg', sizeBytes: 400,
      });
    });
    const leida = await montar('f7').obtener.ejecutar('c1');
    expect(leida?.uri).toBe(`data:image/jpeg;base64,${JPEG}`);
  });

  it('cada usuario ve solo su foto', async () => {
    await montar('f5').adjuntar.ejecutar('c1', 'galeria');
    expect(await montar('f6').obtener.ejecutar('c1')).toBeNull();
  });

  describe('caché de la foto en el teléfono (F051)', () => {
    it('la segunda lectura sale de la caché: no se vuelve a bajar el archivo de Storage', async () => {
      const { adjuntar, obtener, cache } = montar('a1');
      await adjuntar.ejecutar('c1', 'galeria');
      const primera = await obtener.ejecutar('c1');
      const segunda = await obtener.ejecutar('c1');
      expect(cache.guardados).toBe(1);
      expect(segunda?.uri).toBe(primera?.uri);
      expect(primera?.uri).toBe(`data:image/jpeg;base64,${JPEG}`);
    });

    it('reemplazar la foto invalida la caché: se lee la nueva y no queda la vieja', async () => {
      const cache = new CacheContada();
      const una = montar('a2', JPEG, cache);
      await una.adjuntar.ejecutar('c1', 'galeria');
      expect((await una.obtener.ejecutar('c1'))?.uri).toBe(`data:image/jpeg;base64,${JPEG}`);

      const otra = montar('a2', JPEG_2, cache);
      await otra.adjuntar.ejecutar('c1', 'galeria');
      expect((await otra.obtener.ejecutar('c1'))?.uri).toBe(`data:image/jpeg;base64,${JPEG_2}`);
      expect(cache.entradas.size).toBe(1);
    });

    it('quitar la foto también quita su copia del teléfono', async () => {
      const { adjuntar, obtener, quitar, cache } = montar('a3');
      await adjuntar.ejecutar('c1', 'galeria');
      await obtener.ejecutar('c1');
      expect(cache.entradas.size).toBe(1);
      await quitar.ejecutar('c1');
      expect(cache.entradas.size).toBe(0);
    });

    it('si la caché falla (disco lleno), la foto se ve igual', async () => {
      const { adjuntar, obtener, cache } = montar('a4');
      await adjuntar.ejecutar('c1', 'galeria');
      cache.fallar = true;
      const leida = await obtener.ejecutar('c1');
      expect(leida?.uri).toBe(`data:image/jpeg;base64,${JPEG}`);
    });

    it('guardar la foto deja `updatedAt` en el documento (es la versión de la caché)', async () => {
      const { adjuntar, db } = montar('a5');
      await adjuntar.ejecutar('c1', 'galeria');
      const meta = (await getDoc(doc(db, 'mediq_users/a5/visits/c1/prescriptions/receta/attachments/foto'))).data();
      expect(meta?.updatedAt?.toMillis?.()).toBeGreaterThan(0);
    });
  });

  describe('ver la foto sin internet (F051, opción C)', () => {
    it('sin internet se ve la copia guardada, con su tamaño y sus dimensiones, sin tocar la nube', async () => {
      const { adjuntar, obtener, db, red } = montar('a6');
      await adjuntar.ejecutar('c1', 'galeria');
      const conInternet = await obtener.ejecutar('c1');

      red.conectado = false;
      await disableNetwork(db); // si la lectura intentara usar la nube, fallaría
      const sinInternet = await obtener.ejecutar('c1');
      expect(sinInternet?.uri).toBe(conInternet?.uri);
      expect(sinInternet?.foto).toEqual({ tipoMime: 'image/jpeg', bytes: 400, ancho: 1, alto: 1 });
    });

    it('sin internet y sin haberla visto antes, no hay foto (null) y no falla', async () => {
      const { adjuntar, obtener, db, red } = montar('a7');
      await adjuntar.ejecutar('c1', 'galeria'); // existe en la nube, pero esta caché nunca la vio
      red.conectado = false;
      await disableNetwork(db);
      expect(await obtener.ejecutar('c1')).toBeNull();
    });

    it('si el teléfono cree que hay internet pero la nube no responde, también se ve la copia', async () => {
      const { adjuntar, obtener, db } = montar('a8');
      await adjuntar.ejecutar('c1', 'galeria');
      const conInternet = await obtener.ejecutar('c1');
      await disableNetwork(db);
      expect((await obtener.ejecutar('c1'))?.uri).toBe(conInternet?.uri);
    });

    it('al volver el internet se lee la versión actual: si se reemplazó la foto, se baja la nueva', async () => {
      const cache = new CacheContada();
      const red = new RedFalsa();
      const una = montar('a9', JPEG, cache, red);
      await una.adjuntar.ejecutar('c1', 'galeria');
      await una.obtener.ejecutar('c1');
      const otra = montar('a9', JPEG_2, cache, red); // otro dispositivo reemplaza la foto
      await otra.adjuntar.ejecutar('c1', 'galeria');
      expect((await una.obtener.ejecutar('c1'))?.uri).toBe(`data:image/jpeg;base64,${JPEG_2}`);
    });
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

    it('solo JPEG: PNG y SVG se rechazan aunque sean imágenes (F037)', async () => {
      await assertFails(subir('s6', 's6', JPEG, 'image/png'));
      await assertFails(subir('s6', 's6', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), 'image/svg+xml'));
      await assertSucceeds(subir('s6', 's6'));
    });

    it('solo se escribe en la ruta de la foto de receta, no en otras subrutas del usuario (F037)', async () => {
      const otra = (ruta: string) => uploadString(ref(montar('s7').storage, ruta), JPEG, 'base64', { contentType: 'image/jpeg' });
      await assertSucceeds(otra('mediq_users/s7/visits/c1/receta.jpg'));
      await assertFails(otra('mediq_users/s7/otra.jpg'));
      await assertFails(otra('mediq_users/s7/visits/c1/otro.jpg'));
      await assertFails(otra('mediq_users/s7/visits/c1/extra/receta.jpg'));
      await assertFails(otra('mediq_users/s7/visits/c1/receta.png'));
    });

    it('el dueño puede borrar y listar su carpeta (baja de la cuenta) pero otro no (F037)', async () => {
      await assertSucceeds(subir('s8', 's8'));
      await assertFails(deleteObject(ref(montar('s9').storage, ruta('s8'))));
      await assertSucceeds(listAll(ref(montar('s8').storage, 'mediq_users/s8')));
      await assertSucceeds(deleteObject(ref(montar('s8').storage, ruta('s8'))));
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

    it('storagePath debe ser la ruta de la foto de ESTA consulta de ESTE usuario (F038)', async () => {
      const { db } = montar('a4');
      const r = doc(db, ruta('a4'));
      await assertFails(setDoc(r, { ...valido(), storagePath: 'mediq_users/otro/visits/c1/receta.jpg' }));
      await assertFails(setDoc(r, { ...valido(), storagePath: 'mediq_users/a4/visits/c2/receta.jpg' }));
      await assertFails(setDoc(r, { ...valido(), storagePath: 'mediq_users/a4/visits/c1/otra.jpg' }));
      await assertFails(setDoc(r, { ...valido(), storagePath: 'mediq_users/a4/visits/c1/receta.jpg/../../../otro' }));
      await assertSucceeds(setDoc(r, { ...valido(), storagePath: 'mediq_users/a4/visits/c1/receta.jpg' }));
    });

    it('otro usuario no puede escribir en mi adjunto', async () => {
      await assertFails(setDoc(doc(montar('a3').db, ruta('a2')), valido()));
    });
  });

  // AUD-15 / F066: Firestore y Storage no comparten una operación atómica. Se elige el orden que, si algo falla, deja el estado seguro y recuperable.
  describe('consistencia entre Storage, Firestore y la caché (AUD-15 / F066)', () => {
    const RUTA = (uid: string, c: string) => `mediq_users/${uid}/visits/${c}/receta.jpg`;
    const DOC = (uid: string, c: string) => `mediq_users/${uid}/visits/${c}/prescriptions/receta/attachments/foto`;
    const hayArchivo = async (storage: FirebaseStorage, uid: string, c: string) => {
      try {
        await getBytes(ref(storage, RUTA(uid, c)));
        return true;
      } catch {
        return false;
      }
    };
    const hayRegistro = async (db: Firestore, uid: string, c: string) => (await getDoc(doc(db, DOC(uid, c)))).exists();
    /** El repositorio de la cuenta `uid`, pero con la sesión de Firestore y la de Storage de personas distintas: así se provoca que solo UNA de las dos mitades falle. */
    const montarMixto = (uid: string, conDb: string, conStorage: string, cache = new CacheContada()) => {
      const db = entorno.authenticatedContext(conDb).firestore() as unknown as Firestore;
      const storage = entorno.authenticatedContext(conStorage).storage() as unknown as FirebaseStorage;
      return { db, storage, cache, repo: new FirestoreFotoDeRecetaRepository(db, storage, async () => uid, cache, new RedFalsa()) };
    };
    /** Una foto con el tamaño DECLARADO inflado: el dominio la rechazaría (máximo 5 MB), así que se entrega directo al repositorio para que sean las reglas de Firestore las que la rechacen. */
    const fotoQueLasReglasRechazan = { tipoMime: 'image/jpeg' as const, bytes: 6 * 1024 * 1024, ancho: 1, alto: 1 };

    it('quitar borra primero el ARCHIVO: si no se puede, la foto sigue y sigue visible (nada queda oculto en la nube)', async () => {
      const { adjuntar, db, storage } = montar('f8');
      await adjuntar.ejecutar('q1', 'galeria');
      // El archivo no se puede borrar (otra sesión de Storage), pero Firestore sí funcionaría.
      const { repo } = montarMixto('f8', 'f8', 'intruso');
      await expect(repo.quitar('q1')).rejects.toThrow();
      expect(await hayRegistro(db, 'f8', 'q1')).toBe(true);
      expect(await hayArchivo(storage, 'f8', 'q1')).toBe(true);
    });

    it('si falla el segundo paso de quitar (el registro), el archivo ya no está y la lectura repara el registro que quedó colgando', async () => {
      const { adjuntar, db, storage } = montar('f8');
      await adjuntar.ejecutar('q2', 'galeria');
      const { repo } = montarMixto('f8', 'intruso', 'f8'); // el archivo sí se borra, el registro no
      await expect(repo.quitar('q2')).rejects.toThrow();
      expect(await hayArchivo(storage, 'f8', 'q2')).toBe(false);
      expect(await hayRegistro(db, 'f8', 'q2')).toBe(true); // colgando: apunta a un archivo que ya no existe

      const { obtener } = montar('f8');
      expect(await obtener.ejecutar('q2')).toBeNull(); // se ve como «sin foto»...
      expect(await hayRegistro(db, 'f8', 'q2')).toBe(false); // ...y el registro huérfano se borró solo
    });

    it('un registro cuyo archivo falta no rompe la pantalla: se lee como sin foto, se borra el registro y la copia del teléfono', async () => {
      const { adjuntar, obtener, db, storage, cache } = montar('f8');
      await adjuntar.ejecutar('q3', 'galeria');
      await obtener.ejecutar('q3'); // la foto queda en la caché del teléfono
      expect(await cache.ultimaDe(prefijoDeCache('f8', 'q3'))).not.toBeNull();
      await deleteObject(ref(storage, RUTA('f8', 'q3')));

      // Con otra caché vacía (otro aparato) se intenta bajar el archivo, que ya no está.
      const otro = montar('f8', JPEG, new CacheContada());
      expect(await otro.obtener.ejecutar('q3')).toBeNull();
      expect(await hayRegistro(db, 'f8', 'q3')).toBe(false);
    });

    it('si la nube confirma que ya no hay foto (se quitó desde otro aparato), la copia del teléfono se borra y no reaparece sin internet', async () => {
      const cache = new CacheContada();
      const { adjuntar, obtener, red, quitar } = montar('f8', JPEG, cache);
      await adjuntar.ejecutar('q4', 'galeria');
      await obtener.ejecutar('q4');
      expect(await cache.ultimaDe(prefijoDeCache('f8', 'q4'))).not.toBeNull();

      // La quita OTRO aparato (otra caché): esta caché sigue con la copia.
      await montar('f8').quitar.ejecutar('q4');
      expect(await cache.ultimaDe(prefijoDeCache('f8', 'q4'))).not.toBeNull();

      expect(await obtener.ejecutar('q4')).toBeNull(); // con internet: la nube dice que no hay
      expect(await cache.ultimaDe(prefijoDeCache('f8', 'q4'))).toBeNull(); // la copia ya no está...
      red.conectado = false;
      expect(await obtener.ejecutar('q4')).toBeNull(); // ...y sin internet tampoco reaparece
      void quitar;
    });

    it('la PRIMERA foto cuyo registro rechazan las reglas no deja el archivo suelto: se borra y el error sube', async () => {
      const { db, storage, repo } = montarMixto('f8', 'f8', 'f8');
      // Las reglas de Firestore rechazan el registro (máximo 5 MB declarados) aunque Storage acepta el archivo real, que es pequeño.
      await expect(repo.guardar('q5', fotoQueLasReglasRechazan, JPEG)).rejects.toThrow();
      expect(await hayRegistro(db, 'f8', 'q5')).toBe(false);
      expect(await hayArchivo(storage, 'f8', 'q5')).toBe(false); // sin archivo huérfano
    });

    it('si el registro de un REEMPLAZO es rechazado, el registro anterior queda intacto, el error sube y esta copia del teléfono se descarta', async () => {
      const cache = new CacheContada();
      const { adjuntar, obtener, db } = montar('f8', JPEG, cache);
      await adjuntar.ejecutar('q6', 'galeria');
      await obtener.ejecutar('q6');
      const antes = (await getDoc(doc(db, DOC('f8', 'q6')))).data()?.sizeBytes;

      const { repo } = montarMixto('f8', 'f8', 'f8', cache);
      await expect(repo.guardar('q6', fotoQueLasReglasRechazan, JPEG)).rejects.toThrow();
      expect((await getDoc(doc(db, DOC('f8', 'q6')))).data()?.sizeBytes).toBe(antes); // el registro no cambió
      // Límite conocido: el archivo de Storage ya se sobrescribió (la ruta es fija) y no se puede restaurar; por eso la copia vieja se descarta
      // y este aparato vuelve a bajar lo que de verdad hay en la nube. Reintentar guardar deja todo coherente.
      expect(await cache.ultimaDe(prefijoDeCache('f8', 'q6'))).toBeNull();
    });
  });
});

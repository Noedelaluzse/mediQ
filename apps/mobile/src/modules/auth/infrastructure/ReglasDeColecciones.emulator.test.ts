/// <reference types="node" />
// Reglas REALES de Firestore para el documento del usuario y las colecciones patients, consents, places y doctors.
// Requiere emulador (pnpm test:emulator). Los campos de cada caso son los que escribe la app (ver los repositorios).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';

import { contextoConGoogle } from '@/shared/testing/identidadGoogle';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Reglas de usuario, patients, consents, places y doctors (reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-colecciones',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const ref = (uid: string, ruta: string, como = uid) => doc(db(como), `mediq_users/${uid}${ruta}`);

  describe('documento del usuario', () => {
    const valido = () => ({ googleSub: 'g1', email: 'ana@mail.com', displayName: 'Ana', createdAt: serverTimestamp() });
    // F042: se escribe con la identidad de Google del token (`g1`), como en el inicio de sesión real.
    const documento = (uid: string, como = uid, sub = 'g1') => doc(contextoConGoogle(entorno, como, sub).firestore() as unknown as Firestore, `mediq_users/${uid}`);

    it('acepta lo que escribe el registro de cuenta', async () => {
      await assertSucceeds(setDoc(documento('c1'), valido()));
    });
    it('rechaza campos extra, faltantes o de otro tipo', async () => {
      await assertFails(setDoc(documento('c2'), { ...valido(), rol: 'admin' }));
      const { email: _e, ...sinCorreo } = valido();
      await assertFails(setDoc(documento('c3'), sinCorreo));
      await assertFails(setDoc(documento('c4'), { ...valido(), displayName: 42 }));
    });
    it('otro usuario no puede escribirlo', async () => {
      await assertFails(setDoc(documento('c5', 'intruso'), valido()));
    });
    it('googleSub debe ser el de la identidad de Google del token (F042)', async () => {
      await assertSucceeds(setDoc(documento('c6'), valido()));
      await assertFails(setDoc(documento('c7'), { ...valido(), googleSub: 'suplantado' }));
      await assertFails(setDoc(documento('c8', 'c8', 'g1'), { ...valido(), googleSub: 'g2' }));
    });
    it('sin identidad de Google en el token no se escribe la cuenta (F042)', async () => {
      await assertFails(setDoc(ref('c9', ''), valido()));
    });
    it('googleSub no se puede cambiar después de creado (F042)', async () => {
      await assertSucceeds(setDoc(documento('c10'), valido()));
      await assertFails(updateDoc(documento('c10'), { googleSub: 'otro', updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(documento('c10'), { displayName: 'Ana María', updatedAt: serverTimestamp() }));
    });
  });

  describe('patients', () => {
    const perfil = (extra = {}) => ({ fullName: 'Ana', isSelf: true, createdAt: serverTimestamp(), ...extra });

    it('acepta el perfil propio (id self, isSelf verdadero)', async () => {
      await assertSucceeds(setDoc(ref('p1', '/patients/self'), perfil()));
    });
    it('el id self exige isSelf verdadero, y isSelf verdadero exige el id self', async () => {
      await assertFails(setDoc(ref('p2', '/patients/self'), perfil({ isSelf: false })));
      await assertFails(setDoc(ref('p3', '/patients/abc123'), perfil({ isSelf: true })));
      await assertSucceeds(setDoc(ref('p4', '/patients/abc123'), perfil({ isSelf: false })));
    });
    it('no se puede cambiar isSelf después de creado', async () => {
      await setDoc(ref('p5', '/patients/abc123'), perfil({ isSelf: false }));
      await assertFails(updateDoc(ref('p5', '/patients/abc123'), { isSelf: true }));
      await assertSucceeds(updateDoc(ref('p5', '/patients/abc123'), { fullName: 'Otra', updatedAt: serverTimestamp() }));
    });
    it('rechaza campos extra y nombre vacío', async () => {
      await assertFails(setDoc(ref('p6', '/patients/self'), perfil({ extra: 1 })));
      await assertFails(setDoc(ref('p7', '/patients/self'), perfil({ fullName: '' })));
    });
  });

  describe('consents (recibos inmutables)', () => {
    const recibo = (extra = {}) => ({ documento: 'aviso_privacidad', version: '2026-10-05', acceptedAt: serverTimestamp(), ...extra });
    const ruta = '/consents/aviso_privacidad_2026-10-05';

    it('acepta el recibo que registra la app (id documento_versión, hora del servidor)', async () => {
      await assertSucceeds(setDoc(ref('k1', ruta), recibo()));
    });
    it('el id debe ser documento_versión y el documento uno conocido', async () => {
      await assertFails(setDoc(ref('k2', '/consents/otro_id'), recibo()));
      await assertFails(setDoc(ref('k3', '/consents/terminos_2026-10-05'), recibo()));
      await assertFails(setDoc(ref('k4', '/consents/cookies_2026-10-05'), recibo({ documento: 'cookies' })));
    });
    it('la fecha la pone el servidor: una fecha escrita por el cliente se rechaza', async () => {
      await assertFails(setDoc(ref('k5', ruta), recibo({ acceptedAt: Timestamp.fromDate(new Date('2020-01-01')) })));
    });
    it('un recibo ya guardado no se puede reescribir; sí se puede borrar (baja de cuenta)', async () => {
      await setDoc(ref('k6', ruta), recibo());
      await assertFails(setDoc(ref('k6', ruta), recibo()));
      await assertFails(updateDoc(ref('k6', ruta), { version: '2099-01-01' }));
      await assertSucceeds(deleteDoc(ref('k6', ruta)));
    });
    it('rechaza campos extra y versiones con formato raro', async () => {
      await assertFails(setDoc(ref('k7', ruta), recibo({ extra: 1 })));
      await assertFails(setDoc(ref('k8', '/consents/aviso_privacidad_hoy'), recibo({ version: 'hoy' })));
    });
  });

  describe('places', () => {
    const lugar = (extra = {}) => ({ name: 'Hospital Morelos', nameKey: 'hospital morelos', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra });

    it('acepta lo que escribe la app y su renombrado', async () => {
      await assertSucceeds(setDoc(ref('l1', '/places/l1'), lugar()));
      await assertSucceeds(updateDoc(ref('l1', '/places/l1'), { name: 'Hospital Nuevo', nameKey: 'hospital nuevo', updatedAt: serverTimestamp() }));
    });
    it('rechaza nombre vacío o de más de 80 caracteres, campos extra y tipos erróneos', async () => {
      await assertFails(setDoc(ref('l2', '/places/l1'), lugar({ name: '' })));
      await assertFails(setDoc(ref('l3', '/places/l1'), lugar({ name: 'x'.repeat(81) })));
      await assertFails(setDoc(ref('l4', '/places/l1'), lugar({ extra: 1 })));
      await assertFails(setDoc(ref('l5', '/places/l1'), lugar({ nameKey: 7 })));
    });
    it('se puede borrar de verdad', async () => {
      await setDoc(ref('l6', '/places/l1'), lugar());
      await assertSucceeds(deleteDoc(ref('l6', '/places/l1')));
    });
  });

  describe('doctors', () => {
    const medico = (extra = {}) => ({ fullName: 'Dra. Mariana Solís', specialty: 'cardiologia', deletedAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra });

    it('acepta el médico mínimo y uno con teléfono, cédula y notas', async () => {
      await assertSucceeds(setDoc(ref('d1', '/doctors/m1'), medico()));
      await assertSucceeds(setDoc(ref('d2', '/doctors/m1'), medico({ phone: '9981234567', licenseNumber: '123456', notes: 'Lunes y jueves' })));
    });
    it('el borrado lógico marca deletedAt con una fecha', async () => {
      await setDoc(ref('d3', '/doctors/m1'), medico());
      await assertSucceeds(updateDoc(ref('d3', '/doctors/m1'), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    });
    it('rechaza nombre vacío, campos extra y tipos erróneos', async () => {
      await assertFails(setDoc(ref('d4', '/doctors/m1'), medico({ fullName: '' })));
      await assertFails(setDoc(ref('d5', '/doctors/m1'), medico({ extra: 1 })));
      await assertFails(setDoc(ref('d6', '/doctors/m1'), medico({ phone: 12345 })));
      await assertFails(setDoc(ref('d7', '/doctors/m1'), medico({ deletedAt: 'ayer' })));
      await assertFails(setDoc(ref('d8', '/doctors/m1'), medico({ specialty: 5 })));
    });
    it('otro usuario no puede escribir ni borrar', async () => {
      await setDoc(ref('d9', '/doctors/m1'), medico());
      await assertFails(setDoc(ref('d9', '/doctors/m2', 'intruso'), medico()));
      await assertFails(deleteDoc(ref('d9', '/doctors/m1', 'intruso')));
    });
  });
});

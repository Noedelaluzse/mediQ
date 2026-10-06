/// <reference types="node" />
// Integración REAL: datos de salud en patients/self con las reglas reales. Requiere emulador (pnpm test:emulator).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { FirestoreDatosDeSaludRepository } from './FirestoreDatosDeSaludRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'mujer',
  tipoDeSangre: 'AB-',
  alergias: { sinConocidas: false, items: ['Polen', 'Mariscos'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe.skipIf(!hayEmulador)('Datos de salud contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-salud',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const perfil = (uid: string) => doc(db(uid), `mediq_users/${uid}/patients/self`);
  const crearPerfil = (uid: string) => setDoc(perfil(uid), { fullName: 'Ana', isSelf: true, createdAt: serverTimestamp() });
  const repo = (uid: string) => new FirestoreDatosDeSaludRepository(db(uid), async () => uid);

  it('una cuenta de antes (sin datos de salud) se lee como sin datos', async () => {
    await crearPerfil('s1');
    expect(await repo('s1').obtener()).toEqual(SIN_DATOS);
  });

  it('guardar y leer devuelve lo mismo', async () => {
    await crearPerfil('s2');
    await repo('s2').guardar(completos);
    expect(await repo('s2').obtener()).toEqual(completos);
  });

  it('guardar no pisa el nombre ni isSelf', async () => {
    await crearPerfil('s3');
    await repo('s3').guardar(completos);
    expect((await getDoc(perfil('s3'))).data()).toMatchObject({ fullName: 'Ana', isSelf: true });
  });

  it('quitar un dato lo quita de verdad', async () => {
    await crearPerfil('s4');
    await repo('s4').guardar(completos);
    await repo('s4').guardar(SIN_DATOS);
    expect(await repo('s4').obtener()).toEqual(SIN_DATOS);
    expect((await getDoc(perfil('s4'))).data()).not.toHaveProperty('birthDate');
  });

  describe('reglas de patients con datos de salud', () => {
    const sano = () => ({ birthDate: '1990-03-14', sex: 'female', bloodType: 'O+', allergies: ['Polen'], noKnownAllergies: false, drugAllergies: [], noKnownDrugAllergies: true });

    it('acepta el documento del modelo', async () => {
      await crearPerfil('r1');
      await assertSucceeds(updateDoc(perfil('r1'), { ...sano(), updatedAt: serverTimestamp() }));
    });

    it('rechaza fecha mal formada, sexo y sangre fuera de catálogo', async () => {
      await crearPerfil('r2');
      await assertFails(updateDoc(perfil('r2'), { ...sano(), birthDate: '14/03/1990' }));
      await assertFails(updateDoc(perfil('r2'), { ...sano(), birthDate: 19900314 }));
      await assertFails(updateDoc(perfil('r2'), { ...sano(), sex: 'x' }));
      await assertFails(updateDoc(perfil('r2'), { ...sano(), bloodType: 'Z+' }));
    });

    it('rechaza más de 30 alergias, listas que no son listas y marcas que no son booleanas', async () => {
      await crearPerfil('r3');
      await assertFails(updateDoc(perfil('r3'), { ...sano(), allergies: Array.from({ length: 31 }, (_, i) => `a${i}`) }));
      await assertFails(updateDoc(perfil('r3'), { ...sano(), allergies: 'polen' }));
      await assertFails(updateDoc(perfil('r3'), { ...sano(), noKnownAllergies: 'si' }));
    });

    it('«ninguna conocida» no puede venir con alergias escritas', async () => {
      await crearPerfil('r4');
      await assertFails(updateDoc(perfil('r4'), { ...sano(), noKnownAllergies: true, allergies: ['Polen'] }));
      await assertFails(updateDoc(perfil('r4'), { ...sano(), noKnownDrugAllergies: true, drugAllergies: ['Penicilina'] }));
    });

    it('rechaza campos extra', async () => {
      await crearPerfil('r5');
      await assertFails(updateDoc(perfil('r5'), { ...sano(), religion: 'x' }));
    });

    it('otro usuario no puede leer ni escribir los datos de salud', async () => {
      await crearPerfil('r6');
      await assertFails(updateDoc(doc(db('intruso'), 'mediq_users/r6/patients/self'), sano()));
      await assertFails(getDoc(doc(db('intruso'), 'mediq_users/r6/patients/self')));
    });
  });
});

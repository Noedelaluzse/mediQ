/// <reference types="node" />
// Integración REAL: abrir una consulta y su teléfono contra el emulador con reglas reales. Requiere emulador.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreMedicosRepository';

import { ContactoDeMedicoDelDirectorio } from './adaptadoresDeMedicos';
import { FirestoreDetalleDeConsultaRepository } from './FirestoreDetalleDeConsultaRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Detalle de consulta contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-detalle',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const base = { patientId: 'self', specialty: 'cardiologia', visitType: 'especialista', visitMode: 'presencial', visitedAt: Timestamp.fromDate(new Date(2026, 8, 28, 11, 0)) };
      await setDoc(doc(db, 'mediq_users/u1/visits/v1'), { ...base, doctorId: 'm1', doctorName: 'Dra. Solís', placeName: 'Clínica', office: '204', reason: 'Revisión', deletedAt: null });
      await setDoc(doc(db, 'mediq_users/u1/visits/borrada'), { ...base, deletedAt: Timestamp.now() });
      await setDoc(doc(db, 'mediq_users/u1/doctors/m1'), { fullName: 'Dra. Solís', specialty: 'cardiologia', phone: '998 555 0142', deletedAt: null });
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;

  it('abre una consulta existente con todos sus datos', async () => {
    const c = await new FirestoreDetalleDeConsultaRepository(db('u1'), async () => 'u1').obtener('v1');
    expect(c).toMatchObject({ id: 'v1', consultorio: '204', motivo: 'Revisión', medico: { id: 'm1', nombre: 'Dra. Solís' } });
  });

  it('una consulta inexistente o borrada devuelve null', async () => {
    const repo = new FirestoreDetalleDeConsultaRepository(db('u1'), async () => 'u1');
    expect(await repo.obtener('no-existe')).toBeNull();
    expect(await repo.obtener('borrada')).toBeNull();
  });

  it('otro usuario no ve la consulta', async () => {
    expect(await new FirestoreDetalleDeConsultaRepository(db('u2'), async () => 'u2').obtener('v1')).toBeNull();
  });

  it('el teléfono sale del directorio de médicos', async () => {
    const contacto = new ContactoDeMedicoDelDirectorio(new FirestoreMedicosRepository(db('u1'), async () => 'u1'));
    expect(await contacto.telefonoDe('m1')).toBe('998 555 0142');
    expect(await contacto.telefonoDe('fantasma')).toBeUndefined();
  });
});

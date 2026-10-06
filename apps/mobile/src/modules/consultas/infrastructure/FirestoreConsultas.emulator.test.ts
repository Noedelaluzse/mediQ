/// <reference types="node" />
// Integración REAL: guardar una consulta y comprobar que el directorio de médicos (F007/F008) la ve. Requiere emulador.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository';
import { FirestoreLugaresRepository } from '@/modules/medicos/infrastructure/FirestoreLugaresRepository';
import { FirestoreMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreMedicosRepository';

import { RegistrarConsulta } from '../application/RegistrarConsulta';
import { FirestoreConsultasRepository } from './FirestoreConsultasRepository';
import { LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from './adaptadoresDeMedicos';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Registrar consulta contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-registrar',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const montar = (uid: string) => {
    const db = entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
    const usuario = async () => uid;
    let n = 0;
    const id = () => `id${++n}`.padEnd(20, 'x');
    const medicos = new FirestoreMedicosRepository(db, usuario);
    const lugares = new FirestoreLugaresRepository(db, usuario);
    return {
      db,
      medicos,
      lugares,
      directorio: new FirestoreConsultasDeMedicosRepository(db, usuario),
      registrar: new RegistrarConsulta(
        new FirestoreConsultasRepository(db, usuario),
        new MedicosParaConsultaDeMedicos(medicos, id),
        new LugaresParaConsultaDeMedicos(lugares, id),
        id,
        () => new Date(),
      ),
    };
  };

  const ayer = () => new Date(Date.now() - 86_400_000);

  it('guarda la consulta, crea al médico y al lugar, y el directorio los ve', async () => {
    const { registrar, medicos, lugares, directorio } = montar('u1');
    const r = await registrar.ejecutar({
      fecha: ayer(),
      especialidad: 'cardiologia',
      lugar: 'Clínica del Sureste',
      consultorio: '204',
      medicoNombre: 'Dra. Mariana Solís',
      medicoTelefono: '998 555 0142',
      motivo: 'Revisión de presión',
      notasDelMedico: 'Bajar la sal',
      proximaCita: new Date(Date.now() + 10 * 86_400_000),
    });
    expect(r.ok).toBe(true);

    expect((await medicos.listar()).map((m) => m.nombreCompleto)).toEqual(['Dra. Mariana Solís']);
    expect((await lugares.listar()).map((l) => l.nombre)).toEqual(['Clínica del Sureste']);

    const medicoId = (await medicos.listar())[0].id;
    const resumen = (await directorio.resumenPorMedico()).get(medicoId);
    expect(resumen).toMatchObject({ consultas: 1, lugares: ['Clínica del Sureste'] });
    expect(await directorio.contarTodas()).toBe(1);
  });

  it('una segunda consulta reutiliza al mismo médico y lugar (sin duplicados)', async () => {
    const { registrar, medicos, lugares, directorio } = montar('u2');
    const datos = { fecha: ayer(), especialidad: 'cardiologia', lugar: 'Hospital Morelos', medicoNombre: 'Dr. Pech' };
    await registrar.ejecutar(datos);
    await registrar.ejecutar({ ...datos, lugar: 'hospital morelos', medicoNombre: 'dr. pech' });

    expect(await medicos.listar()).toHaveLength(1);
    expect(await lugares.listar()).toHaveLength(1);
    const medicoId = (await medicos.listar())[0].id;
    expect((await directorio.resumenPorMedico()).get(medicoId)?.consultas).toBe(2);
  });

  it('el documento queda con el formato esperado', async () => {
    const { registrar, db } = montar('u3');
    const r = await registrar.ejecutar({ fecha: ayer(), especialidad: 'medicina-general', motivo: 'Gripa' });
    if (!r.ok) throw r.error;
    const d = (await getDoc(doc(db, `mediq_users/u3/visits/${r.value.id}`))).data();
    expect(d).toMatchObject({ patientId: 'self', visitType: 'general', visitMode: 'presencial', specialty: 'medicina-general', reason: 'Gripa', deletedAt: null });
    expect(d?.createdAt).toBeDefined();
  });

  it('el tipo guardado (visitType) se deduce de la especialidad y las reglas lo aceptan, incluida Urgencias', async () => {
    const { registrar, db } = montar('u3b');
    const esperado: Record<string, string> = { cardiologia: 'especialista', odontologia: 'dentista', urgencias: 'urgencias', otra: 'otro', 'medicina-general': 'general' };
    for (const [especialidad, visitType] of Object.entries(esperado)) {
      const r = await registrar.ejecutar({ fecha: ayer(), especialidad });
      if (!r.ok) throw r.error;
      const d = (await getDoc(doc(db, `mediq_users/u3b/visits/${r.value.id}`))).data();
      expect(d).toMatchObject({ specialty: especialidad, visitType });
    }
  });

  it('las reglas rechazan una fecha futura aunque la app la dejara pasar', async () => {
    const { db } = montar('u4');
    const { FirestoreConsultasRepository: Repo } = await import('./FirestoreConsultasRepository');
    const { crearConsulta } = await import('../domain/Consulta');
    const futuro = crearConsulta({ id: 'idfuturoxxxxxxxxxxxx', fecha: new Date(Date.now() + 86_400_000), especialidad: 'medicina-general' }, new Date(Date.now() + 2 * 86_400_000));
    if (!futuro.ok) throw futuro.error;
    await expect(new Repo(db, async () => 'u4').guardar(futuro.value)).rejects.toThrow();
  });
});

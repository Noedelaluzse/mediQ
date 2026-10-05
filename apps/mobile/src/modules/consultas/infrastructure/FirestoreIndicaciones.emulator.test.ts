/// <reference types="node" />
// Integración REAL: indicaciones guardadas con la consulta, y marcar / agregar / quitar. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from './adaptadoresDeMedicos';
import { AgregarIndicacion } from '../application/AgregarIndicacion';
import { AlternarIndicacion } from '../application/AlternarIndicacion';
import { ListarIndicaciones } from '../application/ListarIndicaciones';
import { QuitarIndicacion } from '../application/QuitarIndicacion';
import { RegistrarConsulta } from '../application/RegistrarConsulta';
import { FirestoreConsultasRepository } from './FirestoreConsultasRepository';
import { FirestoreIndicacionesRepository } from './FirestoreIndicacionesRepository';
import { FirestoreLugaresRepository } from '@/modules/medicos/infrastructure/FirestoreLugaresRepository';
import { FirestoreMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreMedicosRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Indicaciones contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-indicaciones',
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
    const indicaciones = new FirestoreIndicacionesRepository(db, usuario);
    return {
      indicaciones,
      registrar: new RegistrarConsulta(
        new FirestoreConsultasRepository(db, usuario),
        new MedicosParaConsultaDeMedicos(new FirestoreMedicosRepository(db, usuario), id),
        new LugaresParaConsultaDeMedicos(new FirestoreLugaresRepository(db, usuario), id),
        id,
        () => new Date(),
      ),
      agregar: new AgregarIndicacion(indicaciones, id),
      alternar: new AlternarIndicacion(indicaciones, () => new Date()),
      quitar: new QuitarIndicacion(indicaciones),
      listar: new ListarIndicaciones(indicaciones),
    };
  };

  const ayer = () => new Date(Date.now() - 86_400_000);
  const base = { fecha: ayer(), tipo: 'especialista', especialidad: 'cardiologia' };

  it('registrar una consulta guarda sus indicaciones en orden, todas pendientes', async () => {
    const { registrar, listar } = montar('u1');
    const r = await registrar.ejecutar({ ...base, indicaciones: ['Medir la presión', 'Análisis en ayunas', 'Reducir sal y café'] });
    if (!r.ok) throw r.error;
    const lista = await listar.ejecutar(r.value.id);
    expect(lista.map((i) => i.texto)).toEqual(['Medir la presión', 'Análisis en ayunas', 'Reducir sal y café']);
    expect(lista.every((i) => i.hechaEn === undefined)).toBe(true);
  });

  it('marcar, desmarcar, agregar y quitar', async () => {
    const { registrar, listar, alternar, agregar, quitar } = montar('u2');
    const r = await registrar.ejecutar({ ...base, indicaciones: ['Uno', 'Dos'] });
    if (!r.ok) throw r.error;
    const consultaId = r.value.id;
    const [uno, dos] = await listar.ejecutar(consultaId);

    expect((await alternar.ejecutar(consultaId, uno.id)).ok).toBe(true);
    expect((await listar.ejecutar(consultaId))[0].hechaEn).toBeInstanceOf(Date);
    await alternar.ejecutar(consultaId, uno.id);
    expect((await listar.ejecutar(consultaId))[0].hechaEn).toBeUndefined();

    const nueva = await agregar.ejecutar(consultaId, 'Volver si sube la presión');
    expect(nueva.ok && nueva.value.orden).toBe(2);

    await quitar.ejecutar(consultaId, dos.id);
    expect((await listar.ejecutar(consultaId)).map((i) => i.texto)).toEqual(['Uno', 'Volver si sube la presión']);
  });

  it('cada usuario ve solo las indicaciones de sus consultas', async () => {
    const a = montar('u3');
    const r = await a.registrar.ejecutar({ ...base, indicaciones: ['Privada'] });
    if (!r.ok) throw r.error;
    expect(await montar('u4').listar.ejecutar(r.value.id)).toEqual([]);
  });

  it('una consulta sin indicaciones no crea documentos de más', async () => {
    const { registrar, listar } = montar('u5');
    const r = await registrar.ejecutar(base);
    if (!r.ok) throw r.error;
    expect(await listar.ejecutar(r.value.id)).toEqual([]);
  });
});

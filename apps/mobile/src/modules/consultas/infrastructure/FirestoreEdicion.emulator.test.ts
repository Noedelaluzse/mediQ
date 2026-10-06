/// <reference types="node" />
// Integración REAL: editar y eliminar una consulta contra el emulador con reglas reales. Requiere emulador.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository';
import { FirestoreLugaresRepository } from '@/modules/medicos/infrastructure/FirestoreLugaresRepository';
import { FirestoreMedicosRepository } from '@/modules/medicos/infrastructure/FirestoreMedicosRepository';

import { AlternarIndicacion } from '../application/AlternarIndicacion';
import { EditarConsulta } from '../application/EditarConsulta';
import { EliminarConsulta } from '../application/EliminarConsulta';
import { ListarDiario } from '../application/ListarDiario';
import { ListarIndicaciones } from '../application/ListarIndicaciones';
import { ObtenerProximaCita } from '../application/ObtenerProximaCita';
import { RegistrarConsulta } from '../application/RegistrarConsulta';
import { LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from './adaptadoresDeMedicos';
import { FirestoreConsultasRepository } from './FirestoreConsultasRepository';
import { FirestoreDetalleDeConsultaRepository } from './FirestoreDetalleDeConsultaRepository';
import { FirestoreDiarioRepository } from './FirestoreDiarioRepository';
import { FirestoreIndicacionesRepository } from './FirestoreIndicacionesRepository';
import { FirestoreProximaCitaRepository } from './FirestoreProximaCitaRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const DIA = 86_400_000;

describe.skipIf(!hayEmulador)('Editar y eliminar consultas contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-edicion',
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
    const consultas = new FirestoreConsultasRepository(db, usuario);
    const detalle = new FirestoreDetalleDeConsultaRepository(db, usuario);
    const indicaciones = new FirestoreIndicacionesRepository(db, usuario);
    const puertoMedicos = new MedicosParaConsultaDeMedicos(medicos, id);
    const puertoLugares = new LugaresParaConsultaDeMedicos(lugares, id);
    return {
      db,
      detalle,
      registrar: new RegistrarConsulta(consultas, puertoMedicos, puertoLugares, id, () => new Date()),
      editar: new EditarConsulta(consultas, detalle, puertoMedicos, puertoLugares, () => new Date()),
      eliminar: new EliminarConsulta(consultas, detalle),
      alternar: new AlternarIndicacion(indicaciones, () => new Date()),
      listarIndicaciones: new ListarIndicaciones(indicaciones),
      diario: new ListarDiario(new FirestoreDiarioRepository(db, usuario)),
      proxima: new ObtenerProximaCita(new FirestoreProximaCitaRepository(db, usuario), () => new Date()),
      resumen: new FirestoreConsultasDeMedicosRepository(db, usuario),
    };
  };

  const base = { fecha: new Date(Date.now() - 3 * DIA), tipo: 'general', especialidad: 'medicina-general' };

  it('editar cambia los campos, quita los vaciados y conserva indicaciones, id y fecha de creación', async () => {
    const s = montar('u1');
    const r = await s.registrar.ejecutar({
      ...base,
      lugar: 'Hospital Morelos',
      consultorio: '204',
      motivo: 'Gripa',
      notasDelMedico: 'Reposo',
      proximaCita: new Date(Date.now() + 10 * DIA),
      indicaciones: ['Tomar agua', 'Descansar'],
    });
    if (!r.ok) throw r.error;
    const id = r.value.id;
    const [primera] = await s.listarIndicaciones.ejecutar(id);
    await s.alternar.ejecutar(id, primera.id);
    const creada = (await getDoc(doc(s.db, `mediq_users/u1/visits/${id}`))).data()?.createdAt;

    const e = await s.editar.ejecutar(id, { fecha: base.fecha, especialidad: 'cardiologia', motivo: 'Revisión de presión' });
    expect(e.ok).toBe(true);

    const c = await s.detalle.obtener(id);
    expect(c).toMatchObject({ id, tipo: 'especialista', especialidad: 'cardiologia', motivo: 'Revisión de presión' });
    expect(c?.lugar).toBeUndefined();
    expect(c?.consultorio).toBeUndefined();
    expect(c?.notasDelMedico).toBeUndefined();
    expect(c?.proximaCita).toBeUndefined();

    const crudo = (await getDoc(doc(s.db, `mediq_users/u1/visits/${id}`))).data();
    expect(crudo?.createdAt).toEqual(creada);
    expect(crudo?.deletedAt).toBeNull();
    // Las indicaciones no se tocan (y la marcada sigue marcada).
    const lista = await s.listarIndicaciones.ejecutar(id);
    expect(lista.map((i) => i.texto)).toEqual(['Tomar agua', 'Descansar']);
    expect(lista[0].hechaEn).toBeInstanceOf(Date);
  });

  it('editar una consulta con médico y lugar nuevos los guarda y la cuenta del médico sube', async () => {
    const s = montar('u2');
    const r = await s.registrar.ejecutar(base);
    if (!r.ok) throw r.error;
    await s.editar.ejecutar(r.value.id, { ...base, medicoNombre: 'Dr. Pech', lugar: 'Clínica Norte' });
    const c = await s.detalle.obtener(r.value.id);
    expect(c?.medico?.nombre).toBe('Dr. Pech');
    expect(c?.lugar?.nombre).toBe('Clínica Norte');
    const resumen = await s.resumen.resumenPorMedico();
    expect([...resumen.values()].map((v) => v.consultas)).toEqual([1]);
  });

  it('las reglas rechazan editar con una fecha futura', async () => {
    const s = montar('u3');
    const r = await s.registrar.ejecutar(base);
    if (!r.ok) throw r.error;
    const e = await s.editar.ejecutar(r.value.id, { ...base, fecha: new Date(Date.now() + 5 * DIA) });
    expect(!e.ok).toBe(true);
  });

  it('eliminar la quita del diario, de la próxima cita, del detalle y de los contadores', async () => {
    const s = montar('u4');
    const a = await s.registrar.ejecutar({ ...base, medicoNombre: 'Dra. Solís', proximaCita: new Date(Date.now() + 7 * DIA) });
    const b = await s.registrar.ejecutar({ ...base, fecha: new Date(Date.now() - 1 * DIA) });
    if (!a.ok || !b.ok) throw new Error('registro');
    expect((await s.diario.ejecutar([])).consultas).toHaveLength(2);
    expect(await s.proxima.ejecutar()).not.toBeNull();

    const r = await s.eliminar.ejecutar(a.value.id);
    expect(r.ok).toBe(true);

    expect((await s.diario.ejecutar([])).consultas.map((c) => c.id)).toEqual([b.value.id]);
    expect(await s.proxima.ejecutar()).toBeNull();
    expect(await s.detalle.obtener(a.value.id)).toBeNull();
    expect(await s.resumen.contarTodas()).toBe(1);
    // Borrado lógico: el documento sigue, con deletedAt.
    expect((await getDoc(doc(s.db, `mediq_users/u4/visits/${a.value.id}`))).data()?.deletedAt).toBeTruthy();
  });

  it('eliminar o editar una consulta de otro usuario no funciona', async () => {
    const dueno = montar('u5');
    const r = await dueno.registrar.ejecutar(base);
    if (!r.ok) throw r.error;
    const otro = montar('u6');
    expect((await otro.eliminar.ejecutar(r.value.id)).ok).toBe(false);
    expect((await otro.editar.ejecutar(r.value.id, base)).ok).toBe(false);
    expect(await dueno.detalle.obtener(r.value.id)).not.toBeNull();
  });
});

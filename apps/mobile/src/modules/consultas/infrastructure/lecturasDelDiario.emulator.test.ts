/// <reference types="node" />
// MEDICIÓN Y PRESUPUESTO (F070, AUD-10): cuántos documentos lee la app al ABRIR el Diario por citas, recordatorios y dosis marcadas.
// Antes de F070: 133 lecturas con estos datos (40 recordatorios, 30 ya terminados; 120 dosis marcadas; 12 citas futuras). Requiere
// emulador (pnpm test:emulator). Cuenta lo que Firestore factura: cada documento devuelto por una consulta (mínimo 1) y cada `getDoc`.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, Timestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ObtenerProximaCita } from '../application/ObtenerProximaCita';
import { ObtenerTomasDeHoy } from '../application/ObtenerTomasDeHoy';
import { SincronizarAvisosDeCitas } from '../application/SincronizarAvisosDeCitas';
import { SincronizarAvisosDeTomas } from '../application/SincronizarAvisosDeTomas';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { FirestoreProximaCitaRepository } from './FirestoreProximaCitaRepository';
import { FirestoreRecordatoriosDeTomaRepository } from './FirestoreRecordatoriosDeTomaRepository';
import { FirestoreRegistroDeTomasRepository } from './FirestoreRegistroDeTomasRepository';
import { ProximaCitaCompartida, RecordatoriosCompartidos, RegistroDeTomasCompartido } from './lecturasCompartidas';

const lecturas = vi.hoisted(() => ({ total: 0, reiniciar() { this.total = 0; } }));
vi.mock('firebase/firestore', async (original) => {
  const sdk = await original<typeof import('firebase/firestore')>();
  return {
    ...sdk,
    getDocs: async (...a: Parameters<typeof sdk.getDocs>) => {
      const r = await sdk.getDocs(...a);
      lecturas.total += Math.max(r.size, 1);
      return r;
    },
    getDoc: async (...a: Parameters<typeof sdk.getDoc>) => {
      lecturas.total += 1;
      return sdk.getDoc(...a);
    },
  };
});

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const DIA = 86_400_000;
const HORA = 3_600_000;

/** Sin notificaciones reales: solo importa cuánto se lee para decidir qué programar. */
const programador: ProgramadorDeAvisos = {
  permiso: async () => ({ concedido: true, puedePreguntar: true }),
  pedirPermiso: async () => ({ concedido: true, puedePreguntar: true }),
  reemplazar: async () => undefined,
  programar: async () => undefined,
  cancelar: async () => undefined,
  idsPendientes: async () => [],
  cancelarTodos: async () => undefined,
};

describe.skipIf(!hayEmulador)('Lecturas al abrir el Diario (medición, AUD-10)', () => {
  let entorno: RulesTestEnvironment;
  const ahora = new Date();

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-lecturas-del-diario',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      const lote = writeBatch(db);
      // 40 recordatorios: 30 de tratamientos que terminaron hace 10 a 60 días y 10 vigentes.
      for (let i = 0; i < 40; i++) {
        const activo = i >= 30;
        lote.set(doc(db, `mediq_users/v1/medicationSchedules/c${i}_m${i}`), {
          visitId: `c${i}`,
          itemIndex: 0,
          medicationName: `Medicamento ${i}`,
          dose: '1 tableta',
          frequency: 'Cada 8 horas',
          firstDoseTime: '08:00',
          startsAt: Timestamp.fromMillis(ahora.getTime() - (activo ? DIA : (70 + i) * DIA)),
          endsAt: Timestamp.fromMillis(ahora.getTime() + (activo ? 5 * DIA : -(10 + i) * DIA)),
        });
      }
      // 120 dosis marcadas: 20 en las últimas 30 horas y 100 más antiguas (3 a 30 días).
      for (let i = 0; i < 120; i++) {
        const reciente = i < 20;
        lote.set(doc(db, `mediq_users/v1/doseLogs/toma-c${30 + (i % 10)}-m${30 + (i % 10)}-${String(i).padStart(4, '0')}`), {
          visitId: `c${30 + (i % 10)}`,
          itemIndex: 0,
          medicationName: 'x',
          scheduledFor: Timestamp.fromMillis(ahora.getTime() - (reciente ? (i + 1) * 1.4 * HORA : (3 + (i % 28)) * DIA)),
          takenAt: Timestamp.fromMillis(ahora.getTime() - (reciente ? (i + 1) * 1.4 * HORA : (3 + (i % 28)) * DIA)),
        });
      }
      // 12 consultas con cita futura (1 a 12 días); las 4 más cercanas están borradas.
      for (let i = 1; i <= 12; i++) {
        lote.set(doc(db, `mediq_users/v1/visits/cita${String(i).padStart(2, '0')}`), {
          patientId: 'self',
          specialty: 'cardiologia',
          visitType: 'especialista',
          visitMode: 'presencial',
          visitedAt: Timestamp.fromMillis(ahora.getTime() - DIA),
          nextAppointmentAt: Timestamp.fromMillis(ahora.getTime() + i * DIA),
          deletedAt: i <= 4 ? Timestamp.now() : null,
        });
      }
      await lote.commit();
    });
  }, 120_000);
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = () => entorno.authenticatedContext('v1').firestore() as unknown as Firestore;

  /**
   * Lo que la app hace al abrir el Diario: la tarjeta de próxima cita, los avisos de citas, la tarjeta «Hoy» y los avisos de toma.
   * `compartidas`: como en la app (el contenedor envuelve los repositorios); sin ello cada quien lee por su cuenta (solo con el filtro de vigentes).
   */
  const abrirElDiario = async (compartidas: boolean) => {
    const citasReal = new FirestoreProximaCitaRepository(db(), async () => 'v1');
    const recordatoriosReal = new FirestoreRecordatoriosDeTomaRepository(db(), async () => 'v1');
    const registroReal = new FirestoreRegistroDeTomasRepository(db(), async () => 'v1');
    const citas = compartidas ? new ProximaCitaCompartida(citasReal) : citasReal;
    const recordatorios = compartidas ? new RecordatoriosCompartidos(recordatoriosReal) : recordatoriosReal;
    const registro = compartidas ? new RegistroDeTomasCompartido(registroReal) : registroReal;
    const reloj = () => ahora;
    await Promise.all([
      new ObtenerProximaCita(citas, reloj).ejecutar(),
      new SincronizarAvisosDeCitas(citas, programador, reloj).ejecutar(),
      new ObtenerTomasDeHoy(recordatorios, registro, reloj).ejecutar(),
      new SincronizarAvisosDeTomas(recordatorios, programador, registro, reloj).ejecutar(),
    ]);
  };

  it('abrir el Diario: el filtro de vigentes y las lecturas compartidas bajan las lecturas, y compartir las baja más', async () => {
    lecturas.reiniciar();
    await abrirElDiario(false);
    const soloFiltro = lecturas.total;
    lecturas.reiniciar();
    await abrirElDiario(true);
    const compartidas = lecturas.total;
    if (process.env.SALIDA_DE_MEDICION) writeFileSync(process.env.SALIDA_DE_MEDICION, `abrir el Diario — antes: 133 · solo filtrar vigentes: ${soloFiltro} · filtrar y compartir: ${compartidas}\n`);
    expect(soloFiltro).toBeLessThan(133);
    expect(compartidas).toBeLessThan(soloFiltro);
    expect(compartidas).toBeLessThanOrEqual(45); // citas (10) + recordatorios vigentes (10) + dosis marcadas (~20), cada una UNA vez
  }, 60_000);
});

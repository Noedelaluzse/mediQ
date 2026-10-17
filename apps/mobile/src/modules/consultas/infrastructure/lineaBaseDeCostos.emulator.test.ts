/// <reference types="node" />
// LÍNEA BASE DE COSTOS (F076, AUD-18): cuántos documentos lee la app en las operaciones del Diario y de una consulta con 0, 20, 500 y 2,500 consultas.
// Complementa las mediciones de F068 (Perfil, Médicos, Lugares: `medicos/infrastructure/lecturasPorPantalla.emulator.test.ts`) y F070 (abrir el Diario:
// citas, recordatorios y dosis: `lecturasDelDiario.emulator.test.ts`). Requiere emulador (pnpm test:emulator). Cuenta lo que Firestore factura: cada documento
// devuelto por una consulta (mínimo 1 si no devuelve nada) y cada `getDoc`. No mide las lecturas que hacen las REGLAS (`exists`/`get`), que se cuentan aparte
// (docs/17 §10) ni tiempos ni bytes. Con SALIDA_DE_MEDICION=<archivo> la tabla se guarda ahí (vitest no muestra lo que imprime una prueba).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, Timestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { CargarTodoElDiario, MAXIMO_DE_CONSULTAS_A_BUSCAR } from '../application/CargarTodoElDiario';
import { ObtenerDetalleDeConsulta } from '../application/ObtenerDetalleDeConsulta';
import { FirestoreDetalleDeConsultaRepository } from './FirestoreDetalleDeConsultaRepository';
import { FirestoreDiarioRepository } from './FirestoreDiarioRepository';
import { FirestoreIndicacionesRepository } from './FirestoreIndicacionesRepository';
import { FirestoreRecetaRepository } from './FirestoreRecetaRepository';

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
const TAMANOS = [0, 20, 500, 2500];

describe.skipIf(!hayEmulador)('Línea base de lecturas (medición, AUD-18)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-linea-base',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    // Un usuario por tamaño: u0, u20, u500, u2500. 1 de cada 20 consultas borrada; 3 de cada 10 con receta; la consulta v00001 trae 3 indicaciones y una receta.
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      for (const n of TAMANOS) {
        for (let desde = 0; desde < n; desde += 400) {
          const lote = writeBatch(db);
          for (let i = desde; i < Math.min(desde + 400, n); i++) {
            lote.set(doc(db, `mediq_users/u${n}/visits/v${String(i).padStart(5, '0')}`), {
              patientId: 'self',
              specialty: 'cardiologia',
              visitType: 'especialista',
              visitMode: 'presencial',
              visitedAt: Timestamp.fromDate(new Date(2026, 0, 1, 10, 0, 0, i)),
              doctorId: `m${i % 8}`,
              doctorName: `Dr. ${i % 8}`,
              placeId: `l${i % 6}`,
              placeName: `Lugar ${i % 6}`,
              hasPrescription: i % 10 < 3,
              deletedAt: i % 20 === 7 ? Timestamp.now() : null,
            });
          }
          await lote.commit();
        }
        if (n > 1) {
          const lote = writeBatch(db);
          for (let k = 0; k < 3; k++) lote.set(doc(db, `mediq_users/u${n}/visits/v00001/instructions/i${k}`), { text: `Indicación ${k}`, order: k, doneAt: null });
          lote.set(doc(db, `mediq_users/u${n}/visits/v00001/prescriptions/receta`), { items: [{ id: 'm1', name: 'Losartán', dose: '50 mg' }] });
          await lote.commit();
        }
      }
    });
  }, 120_000);
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const medir = async (accion: () => Promise<unknown>) => {
    lecturas.reiniciar();
    await accion();
    return lecturas.total;
  };

  it('lecturas por operación: la primera página y el detalle no crecen con el historial; la búsqueda sí, hasta el tope de 2,000', async () => {
    const filas = ['| consultas | Diario: primera página | Buscar: historial completo | Detalle de una consulta | Receta de una consulta |', '|---:|---:|---:|---:|---:|'];
    for (const n of TAMANOS) {
      const uid = `u${n}`;
      const diario = new FirestoreDiarioRepository(db(uid), async () => uid);
      const pagina = await medir(() => diario.pagina());
      const buscar = await medir(() => new CargarTodoElDiario(diario).ejecutar());
      const detalle = await medir(() =>
        new ObtenerDetalleDeConsulta(new FirestoreDetalleDeConsultaRepository(db(uid), async () => uid), new FirestoreIndicacionesRepository(db(uid), async () => uid), { telefonoDe: async () => undefined }).ejecutar('v00001'),
      );
      const receta = await medir(() => new FirestoreRecetaRepository(db(uid), async () => uid).obtener('v00001'));
      filas.push(`| ${n} | ${pagina} | ${buscar} | ${detalle} | ${receta} |`);

      const vigentes = n - Math.floor((n + 12) / 20); // las que no tienen i % 20 === 7
      expect(pagina, `primera página con ${n}`).toBeLessThanOrEqual(Math.max(Math.min(vigentes, 20), 1));
      expect(buscar, `búsqueda con ${n}`).toBeLessThanOrEqual(Math.max(Math.min(vigentes, MAXIMO_DE_CONSULTAS_A_BUSCAR) + 20, 1));
      expect(detalle, `detalle con ${n}`).toBeLessThanOrEqual(n > 1 ? 4 : 2);
      expect(receta, `receta con ${n}`).toBeLessThanOrEqual(2);
    }
    if (process.env.SALIDA_DE_MEDICION) writeFileSync(process.env.SALIDA_DE_MEDICION, `${filas.join('\n')}\n`);
  }, 180_000);
});

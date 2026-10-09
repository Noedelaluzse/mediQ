/// <reference types="node" />
// MEDICIÓN Y PRESUPUESTO (F068, AUD-08): cuántos documentos lee cada pantalla con 0, 20, 500 y 2,500 consultas. Requiere emulador (pnpm test:emulator).
// Antes de F068 cada pantalla leía TODAS las consultas (0→1, 20→20, 500→500, 2500→2500); ahora el presupuesto no crece con el historial.
// Cuenta lo que Firestore factura: cada documento devuelto por una consulta (mínimo 1 si no devuelve nada), cada `getDoc` y cada agregación
// (`count()`: 1 lectura por cada 1,000 entradas de índice, mínimo 1). No mide tiempos ni bytes: solo lecturas.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, Timestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { FirestoreConsultasDeMedicosRepository } from './FirestoreConsultasDeMedicosRepository';
import { FirestoreLugaresRepository } from './FirestoreLugaresRepository';

// Contador de lecturas: envuelve las funciones de lectura del SDK para que lo midan TODO lo que usan los repositorios.
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
    getCountFromServer: async (...a: Parameters<typeof sdk.getCountFromServer>) => {
      const r = await sdk.getCountFromServer(...a);
      lecturas.total += Math.max(Math.ceil(r.data().count / 1000), 1);
      return r;
    },
  };
});

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const MEDICOS = 8;
const LUGARES = 6;
const TAMANOS = [0, 20, 500, 2500];

describe.skipIf(!hayEmulador)('Lecturas por pantalla (medición, AUD-08)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-lecturas',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    // Un usuario por tamaño: u0, u20, u500, u2500. Cada consulta: médico y lugar rotativos; 1 de cada 20 borrada; 3 de cada 10 con receta.
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
              doctorId: `m${i % MEDICOS}`,
              doctorName: `Dr. ${i % MEDICOS}`,
              placeId: `l${i % LUGARES}`,
              placeName: `Lugar ${i % LUGARES}`,
              hasPrescription: i % 10 < 3,
              deletedAt: i % 20 === 7 ? Timestamp.now() : null,
            });
          }
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

  const ids = (prefijo: string, cuantos: number) => Array.from({ length: cuantos }, (_, i) => `${prefijo}${i}`);

  it('el costo de Perfil, Médicos y Lugares NO crece con el historial: presupuesto de lecturas con 500 y 2,500 consultas', async () => {
    const filas: string[] = ['| consultas | Perfil: totales | Médicos: resumen | Lugares: por lugar |', '|---:|---:|---:|---:|'];
    for (const n of TAMANOS) {
      const uid = `u${n}`;
      const consultas = new FirestoreConsultasDeMedicosRepository(db(uid), async () => uid);
      const lugares = new FirestoreLugaresRepository(db(uid), async () => uid);
      const perfil = await medir(() => consultas.totales());
      const medicos = await medir(() => consultas.resumenBasicoPorMedico(ids('m', MEDICOS)));
      const porLugar = await medir(() => lugares.consultasPorLugar(ids('l', LUGARES)));
      filas.push(`| ${n} | ${perfil} | ${medicos} | ${porLugar} |`);
      if (n >= 500) {
        // Perfil: 3 conteos (de 1 a 3 lecturas cada uno según su tamaño); Médicos: por médico 1 conteo + 1 búsqueda de la última visita; Lugares: 1 conteo por lugar.
        expect(perfil, `Perfil con ${n}`).toBeLessThanOrEqual(10);
        expect(medicos, `Médicos con ${n}`).toBeLessThanOrEqual(2 * MEDICOS + 4);
        expect(porLugar, `Lugares con ${n}`).toBeLessThanOrEqual(LUGARES + 4);
      }
    }
    // Con SALIDA_DE_MEDICION=<archivo> la tabla se guarda ahí (vitest no muestra lo que imprime una prueba).
    if (process.env.SALIDA_DE_MEDICION) writeFileSync(process.env.SALIDA_DE_MEDICION, `${filas.join('\n')}\n`);
  }, 120_000);
});

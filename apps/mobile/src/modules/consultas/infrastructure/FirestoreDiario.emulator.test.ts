/// <reference types="node" />
// Integración REAL: el diario paginado contra el emulador con las reglas reales. Requiere emulador (pnpm test:emulator).
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CargarTodoElDiario } from '../application/CargarTodoElDiario';
import { buscarConsultas } from '../domain/BusquedaDeConsultas';
import { FirestoreDiarioRepository } from './FirestoreDiarioRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Diario contra el emulador (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-diario',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore;
      // 25 consultas vigentes, una por día (la 1 es la más antigua), y una borrada en medio.
      for (let n = 1; n <= 25; n++) {
        await setDoc(doc(db, `mediq_users/u1/visits/v${String(n).padStart(2, '0')}`), {
          patientId: 'self',
          specialty: 'cardiologia',
          visitType: 'especialista',
          visitMode: 'presencial',
          visitedAt: Timestamp.fromDate(new Date(2026, 8, n, 10, 0)),
          doctorName: `Dr. ${n}`,
          deletedAt: null,
        });
      }
      await setDoc(doc(db, 'mediq_users/u1/visits/borrada'), {
        patientId: 'self',
        specialty: 'otra',
        visitType: 'otro',
        visitMode: 'presencial',
        visitedAt: Timestamp.fromDate(new Date(2026, 8, 30, 10, 0)),
        deletedAt: Timestamp.now(),
      });
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const repo = (uid: string) => new FirestoreDiarioRepository(entorno.authenticatedContext(uid).firestore() as unknown as Firestore, async () => uid);

  it('la primera página trae 20, de la más reciente a la más antigua, sin las borradas', async () => {
    const p = await repo('u1').pagina();
    expect(p.consultas).toHaveLength(20);
    expect(p.consultas[0].medicoNombre).toBe('Dr. 25');
    expect(p.consultas[19].medicoNombre).toBe('Dr. 6');
    expect(p.consultas.some((c) => c.id === 'borrada')).toBe(false);
    expect(p.siguiente).toBeDefined();
  });

  it('la segunda página trae las 5 restantes y ya no hay más', async () => {
    const r = repo('u1');
    const p1 = await r.pagina();
    const p2 = await r.pagina(p1.siguiente);
    expect(p2.consultas.map((c) => c.medicoNombre)).toEqual(['Dr. 5', 'Dr. 4', 'Dr. 3', 'Dr. 2', 'Dr. 1']);
    expect(p2.siguiente).toBeUndefined();
  });

  it('otro usuario no ve nada', async () => {
    expect((await repo('u2').pagina()).consultas).toEqual([]);
  });

  describe('búsqueda (F020, RF-17) sobre el diario real', () => {
    it('cargar todo junta las dos páginas (25 consultas vigentes, sin la borrada) de la más reciente a la más antigua', async () => {
      const r = await new CargarTodoElDiario(repo('u1')).ejecutar();
      expect(r.truncado).toBe(false);
      expect(r.consultas).toHaveLength(25);
      expect(r.consultas[0].medicoNombre).toBe('Dr. 25');
      expect(r.consultas[24].medicoNombre).toBe('Dr. 1');
      expect(r.consultas.some((c) => c.id === 'borrada')).toBe(false);
    });

    it('buscar encuentra una consulta de la segunda página por médico y por especialidad', async () => {
      const { consultas } = await new CargarTodoElDiario(repo('u1')).ejecutar();
      expect(buscarConsultas(consultas, 'dr. 3').map((c) => c.medicoNombre)).toContain('Dr. 3');
      expect(buscarConsultas(consultas, 'Cardiología')).toHaveLength(25);
      expect(buscarConsultas(consultas, 'dermatologia')).toEqual([]);
    });

    it('otro usuario no encuentra nada', async () => {
      const { consultas } = await new CargarTodoElDiario(repo('u2')).ejecutar();
      expect(buscarConsultas(consultas, 'cardio')).toEqual([]);
    });
  });

  // AUD-12 / F067: las borradas se descartan en el teléfono y se piden más páginas hasta juntar 20: sin saltarse ni repetir ninguna vigente.
  describe('páginas con consultas borradas mezcladas (AUD-12)', () => {
    const sembrar = (uid: string, total: number, borrada: (n: number) => boolean) =>
      entorno.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore() as unknown as Firestore;
        for (let n = 1; n <= total; n++) {
          await setDoc(doc(db, `mediq_users/${uid}/visits/m${String(n).padStart(3, '0')}`), {
            patientId: 'self',
            specialty: 'cardiologia',
            visitType: 'especialista',
            visitMode: 'presencial',
            visitedAt: Timestamp.fromDate(new Date(2026, 0, 1, 10, 0, n)),
            doctorName: `Dr. ${n}`,
            deletedAt: borrada(n) ? Timestamp.now() : null,
          });
        }
      });
    const todas = async (uid: string) => {
      const r = repo(uid);
      const ids: string[] = [];
      let paginas = 0;
      let cursor = undefined as Awaited<ReturnType<typeof r.pagina>>['siguiente'];
      do {
        const p = await r.pagina(cursor);
        ids.push(...p.consultas.map((c) => c.id));
        cursor = p.siguiente;
        paginas++;
      } while (cursor && paginas < 20);
      return { ids, paginas };
    };

    it('45 consultas con una de cada tres borrada: se recorren todas las vigentes, en orden, sin repetir ni saltarse ninguna', async () => {
      await sembrar('d7', 45, (n) => n % 3 === 0);
      const { ids } = await todas('d7');
      const esperadas = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => n % 3 !== 0).reverse().map((n) => `m${String(n).padStart(3, '0')}`);
      expect(ids).toEqual(esperadas);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('con todas borradas la primera página queda vacía y sin «siguiente»', async () => {
      await sembrar('d8', 30, () => true);
      const p = await repo('d8').pagina();
      expect(p.consultas).toEqual([]);
      expect(p.siguiente).toBeUndefined();
    });

    it('las borradas más recientes no ocultan a las vigentes más antiguas: 25 borradas encima de 3 vigentes', async () => {
      await sembrar('d9', 28, (n) => n > 3);
      const p = await repo('d9').pagina();
      expect(p.consultas.map((c) => c.id)).toEqual(['m003', 'm002', 'm001']);
      expect(p.siguiente).toBeUndefined();
    });
  });
});


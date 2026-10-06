import { describe, expect, it } from 'vitest';

import { ARBOL_DE_CUENTA, eliminarSubarbol, type Arbol, type RecorridoDeDocumentos } from './eliminarSubarbol';

/** Base falsa: mapa de ruta de colección → ids de documentos. */
const montar = (colecciones: Record<string, string[]>) => {
  const existentes = new Set<string>();
  for (const [ruta, ids] of Object.entries(colecciones)) for (const id of ids) existentes.add(`${ruta}/${id}`);
  const lotes: string[][] = [];
  const io: RecorridoDeDocumentos = {
    listarIds: async (ruta) => colecciones[ruta.join('/')]?.filter((id) => existentes.has(`${ruta.join('/')}/${id}`)) ?? [],
    borrar: async (rutas) => {
      lotes.push(rutas.map((r) => r.join('/')));
      for (const r of rutas) existentes.delete(r.join('/'));
    },
  };
  return { io, lotes, existentes };
};

describe('eliminarSubarbol', () => {
  const arbol: Arbol = { patients: {}, visits: { instructions: {} } };

  it('borra todos los documentos del subárbol y el documento raíz', async () => {
    const { io, existentes } = montar({
      'mediq_users/u1/patients': ['self'],
      'mediq_users/u1/visits': ['v1'],
      'mediq_users/u1/visits/v1/instructions': ['i1', 'i2'],
    });
    existentes.add('mediq_users/u1');

    await eliminarSubarbol(['mediq_users', 'u1'], arbol, io);

    expect([...existentes]).toEqual([]);
  });

  it('borra los hijos antes que el padre y el documento raíz al final', async () => {
    const { io, lotes } = montar({
      'mediq_users/u1/visits': ['v1'],
      'mediq_users/u1/visits/v1/instructions': ['i1'],
    });

    await eliminarSubarbol(['mediq_users', 'u1'], arbol, io);

    const orden = lotes.flat();
    expect(orden.indexOf('mediq_users/u1/visits/v1/instructions/i1')).toBeLessThan(orden.indexOf('mediq_users/u1/visits/v1'));
    expect(orden[orden.length - 1]).toBe('mediq_users/u1');
  });

  it('con colecciones vacías solo borra el documento raíz', async () => {
    const { io, lotes } = montar({});
    await eliminarSubarbol(['mediq_users', 'u1'], arbol, io);
    expect(lotes).toEqual([['mediq_users/u1']]);
  });

  it('borra en lotes de 500 como máximo (límite de Firestore)', async () => {
    const ids = Array.from({ length: 1200 }, (_, i) => `v${i}`);
    const { io, lotes } = montar({ 'mediq_users/u1/visits': ids });

    await eliminarSubarbol(['mediq_users', 'u1'], { visits: {} }, io);

    expect(Math.max(...lotes.map((l) => l.length))).toBeLessThanOrEqual(500);
    expect(lotes.flat()).toHaveLength(1201);
  });

  it('es idempotente: repetirlo tras un borrado completo no falla', async () => {
    const { io } = montar({ 'mediq_users/u1/patients': ['self'] });
    await eliminarSubarbol(['mediq_users', 'u1'], arbol, io);
    await expect(eliminarSubarbol(['mediq_users', 'u1'], arbol, io)).resolves.toBeUndefined();
  });
});

describe('ARBOL_DE_CUENTA (alarma: debe coincidir con docs/11-modelo-de-datos-firestore.md)', () => {
  it('lista todas las colecciones que cuelgan del usuario', () => {
    expect(Object.keys(ARBOL_DE_CUENTA).sort()).toEqual(['consents', 'doctors', 'medicationSchedules', 'patients', 'places', 'visits']);
    expect(Object.keys(ARBOL_DE_CUENTA.visits).sort()).toEqual(['instructions', 'prescriptions']);
    expect(Object.keys(ARBOL_DE_CUENTA.visits.prescriptions).sort()).toEqual(['attachments']);
  });
});

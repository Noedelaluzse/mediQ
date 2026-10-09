import { describe, expect, it } from 'vitest';

import { ADICIONALES_DE_CUENTA, ARBOL_DE_CUENTA, eliminarSubarbol, type Arbol, type RecorridoDeDocumentos } from './eliminarSubarbol';

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
    expect(Object.keys(ARBOL_DE_CUENTA).sort()).toEqual(['consents', 'doctors', 'doseLogs', 'medicationSchedules', 'patients', 'places', 'visits']);
    expect(Object.keys(ARBOL_DE_CUENTA.visits).sort()).toEqual(['instructions', 'prescriptions']);
    expect(Object.keys(ARBOL_DE_CUENTA.visits.prescriptions).sort()).toEqual(['attachments']);
  });
});

/**
 * AUD-02 / F063: Firestore solo lista documentos que EXISTEN. La foto de la receta vive en `visits/{v}/prescriptions/receta/attachments/foto`,
 * pero `receta` puede no existir (la foto se agrega sin receta, o la receta se quita y la foto queda): al recorrer `prescriptions` no sale
 * `receta`, y la foto sobrevivía a la eliminación de la cuenta (RNF-07).
 */
describe('descendientes de un padre que no existe (AUD-02 / F063)', () => {
  const FOTO = 'mediq_users/u1/visits/v1/prescriptions/receta/attachments/foto';
  const base = {
    'mediq_users/u1/visits': ['v1'],
    'mediq_users/u1/visits/v1/prescriptions': [], // el documento `receta` NO existe
    'mediq_users/u1/visits/v1/prescriptions/receta/attachments': ['foto'],
  };

  it('la reproducción: sin ids adicionales la foto sobrevive aunque la cuenta se «borre»', async () => {
    const { io, existentes } = montar(base);
    await eliminarSubarbol(['mediq_users', 'u1'], ARBOL_DE_CUENTA, io);
    expect(existentes.has(FOTO)).toBe(true);
  });

  it('con los ids fijos de la cuenta se alcanza la foto aunque la receta no exista', async () => {
    const { io, existentes } = montar(base);
    await eliminarSubarbol(['mediq_users', 'u1'], ARBOL_DE_CUENTA, io, ADICIONALES_DE_CUENTA);
    expect([...existentes]).toEqual([]);
  });

  it('también alcanza una consulta que no existe como documento pero cuyo id se conoce (por sus archivos en Storage)', async () => {
    const { io, existentes } = montar({
      'mediq_users/u1/visits': [],
      'mediq_users/u1/visits/v9/instructions': ['i1'],
      'mediq_users/u1/visits/v9/prescriptions/receta/attachments': ['foto'],
    });
    await eliminarSubarbol(['mediq_users', 'u1'], ARBOL_DE_CUENTA, io, { ...ADICIONALES_DE_CUENTA, visits: ['v9'] });
    expect([...existentes]).toEqual([]);
  });

  it('un id que además se lista no se borra dos veces', async () => {
    const { io, lotes } = montar({ 'mediq_users/u1/visits': ['v1'], 'mediq_users/u1/visits/v1/prescriptions': ['receta'] });
    await eliminarSubarbol(['mediq_users', 'u1'], ARBOL_DE_CUENTA, io, ADICIONALES_DE_CUENTA);
    expect(lotes.flat().filter((r) => r === 'mediq_users/u1/visits/v1/prescriptions/receta')).toHaveLength(1);
  });

  it('los ids adicionales solo se usan en la colección que los nombra, y solo se RECORREN (no se borra lo que no existe)', async () => {
    const consultadas: string[] = [];
    const { io, lotes } = montar({ 'mediq_users/u1/visits': ['v1'] });
    const listar = io.listarIds;
    io.listarIds = async (ruta) => {
      consultadas.push(ruta.join('/'));
      return listar(ruta);
    };
    await eliminarSubarbol(['mediq_users', 'u1'], ARBOL_DE_CUENTA, io, ADICIONALES_DE_CUENTA);
    expect(consultadas).toContain('mediq_users/u1/visits/v1/prescriptions/receta/attachments');
    expect(consultadas.some((r) => r.startsWith('mediq_users/u1/patients/'))).toBe(false);
    expect(lotes.flat()).not.toContain('mediq_users/u1/visits/v1/prescriptions/receta');
  });

  it('ADICIONALES_DE_CUENTA cubre los ids fijos del modelo (docs/11): la receta y su foto', () => {
    expect(ADICIONALES_DE_CUENTA['visits/prescriptions']).toEqual(['receta']);
    expect(ADICIONALES_DE_CUENTA['visits/prescriptions/attachments']).toEqual(['foto']);
  });
});

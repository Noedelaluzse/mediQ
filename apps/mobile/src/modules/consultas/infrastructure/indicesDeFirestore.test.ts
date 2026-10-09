/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * F077 (AUD-12, parte 2): las consultas con `deletedAt == null` + orden por otro campo exigen índices compuestos. Si el archivo de índices
 * se pierde o cambia, esas consultas fallarían en Firebase aunque el emulador (que no valida índices) no lo note: esta prueba lo vigila.
 */
const raiz = resolve(__dirname, '../../../../../../');
const leer = (ruta: string) => JSON.parse(readFileSync(resolve(raiz, ruta), 'utf8'));

describe('índices de Firestore declarados en el repo', () => {
  const firebase = leer('firebase.json');
  const archivo: string = firebase.firestore?.indexes;

  it('firebase.json referencia el archivo de índices', () => {
    expect(archivo).toBe('firebase/firestore.indexes.json');
  });

  const { indexes } = leer(archivo ?? 'firebase/firestore.indexes.json') as { indexes: { collectionGroup: string; queryScope: string; fields: { fieldPath: string; order: string }[] }[] };
  const campos = (i: (typeof indexes)[number]) => i.fields.map((f) => `${f.fieldPath} ${f.order}`).join(', ');

  it('declara el de la próxima cita: consultas sin borrar ordenadas por la fecha de su cita', () => {
    expect(indexes.some((i) => i.collectionGroup === 'visits' && i.queryScope === 'COLLECTION' && campos(i) === 'deletedAt ASCENDING, nextAppointmentAt ASCENDING')).toBe(true);
  });

  it('declara el del Diario: consultas sin borrar de la más reciente a la más antigua', () => {
    expect(indexes.some((i) => i.collectionGroup === 'visits' && i.queryScope === 'COLLECTION' && campos(i) === 'deletedAt ASCENDING, visitedAt DESCENDING')).toBe(true);
  });

  // F068 (AUD-08): la última visita de cada médico (`doctorId` == y `deletedAt` == con orden por `visitedAt`).
  it('declara el de la última visita de cada médico (Médicos, F068)', () => {
    expect(indexes.some((i) => i.collectionGroup === 'visits' && i.queryScope === 'COLLECTION' && campos(i) === 'doctorId ASCENDING, deletedAt ASCENDING, visitedAt DESCENDING')).toBe(true);
  });

  it('no declara índices de más (cada uno se paga al escribir)', () => {
    expect(indexes).toHaveLength(3);
  });
});

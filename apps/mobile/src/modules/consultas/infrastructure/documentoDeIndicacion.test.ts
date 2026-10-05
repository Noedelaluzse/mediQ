import { describe, expect, it } from 'vitest';

import { aDocumentoDeIndicacion, deDocumentoDeIndicacion } from './documentoDeIndicacion';

describe('documento de indicación (visits/{id}/instructions/{id})', () => {
  it('una pendiente lleva doneAt nulo', () => {
    expect(aDocumentoDeIndicacion({ id: 'i1', texto: 'Medir la presión', orden: 0 })).toEqual({ sortOrder: 0, body: 'Medir la presión', doneAt: null });
  });

  it('una hecha lleva la fecha', () => {
    const f = new Date(2026, 9, 5);
    expect(aDocumentoDeIndicacion({ id: 'i1', texto: 'x', orden: 2, hechaEn: f }).doneAt).toBe(f);
  });

  it('ida y vuelta, aceptando la fecha de Firestore (Timestamp)', () => {
    const f = new Date(2026, 9, 5);
    const de = deDocumentoDeIndicacion('i1', { sortOrder: 1, body: 'Análisis', doneAt: { toDate: () => f } });
    expect(de).toEqual({ id: 'i1', texto: 'Análisis', orden: 1, hechaEn: f });
  });

  it('un documento sin texto se descarta y sin orden cae al final', () => {
    expect(deDocumentoDeIndicacion('i1', { sortOrder: 0 })).toBeNull();
    expect(deDocumentoDeIndicacion('i1', { body: 'x' })?.orden).toBe(Number.MAX_SAFE_INTEGER);
  });
});

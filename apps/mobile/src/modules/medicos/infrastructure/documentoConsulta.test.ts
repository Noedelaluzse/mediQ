import { describe, expect, it } from 'vitest';

import { deDocumentoConsulta } from './documentoConsulta';

describe('deDocumentoConsulta', () => {
  it('traduce una consulta con fecha de Firestore (Timestamp)', () => {
    const fecha = new Date(2026, 8, 28);
    const r = deDocumentoConsulta('v1', { visitedAt: { toDate: () => fecha }, placeName: 'Clínica', reason: 'Revisión' });
    expect(r).toEqual({ id: 'v1', fecha, lugar: 'Clínica', motivo: 'Revisión' });
  });

  it('acepta una fecha normal y campos opcionales ausentes o nulos', () => {
    const fecha = new Date(2026, 0, 1);
    expect(deDocumentoConsulta('v2', { visitedAt: fecha, placeName: null })).toEqual({ id: 'v2', fecha, lugar: undefined, motivo: undefined });
  });

  it('descarta una consulta borrada o sin fecha', () => {
    expect(deDocumentoConsulta('v3', { visitedAt: new Date(), deletedAt: new Date() })).toBeNull();
    expect(deDocumentoConsulta('v4', {})).toBeNull();
  });
});

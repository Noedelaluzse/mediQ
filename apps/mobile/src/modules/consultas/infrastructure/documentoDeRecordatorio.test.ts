import { describe, expect, it } from 'vitest';

import type { RecordatorioDeToma } from '../domain/Toma';
import { aDocumentoDeRecordatorio, deDocumentoDeRecordatorio, idDeRecordatorio } from './documentoDeRecordatorio';

const rec: RecordatorioDeToma = {
  consultaId: 'c1',
  indice: 2,
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde: new Date(2026, 9, 6, 14, 0),
  hasta: new Date(2026, 9, 13, 14, 0),
};

describe('documentoDeRecordatorio (medicationSchedules, docs/11)', () => {
  it('el id es estable por consulta y posición: reescribir reemplaza, no duplica', () => {
    expect(idDeRecordatorio('c1', 2)).toBe('c1_2');
  });

  it('guarda los campos del modelo; la dosis ausente va como null', () => {
    expect(aDocumentoDeRecordatorio(rec)).toEqual({
      visitId: 'c1',
      itemIndex: 2,
      medicationName: 'Losartán',
      dose: '1 tableta',
      frequency: 'Cada 8 horas',
      firstDoseTime: '08:00',
      startsAt: rec.desde,
      endsAt: rec.hasta,
    });
    expect(aDocumentoDeRecordatorio({ ...rec, dosis: undefined }).dose).toBeNull();
  });

  it('lee el documento de vuelta, con fechas de Firestore o Date', () => {
    const d = { visitId: 'c1', itemIndex: 2, medicationName: 'Losartán', dose: null, frequency: 'Cada 8 horas', firstDoseTime: '08:00', startsAt: { toDate: () => rec.desde }, endsAt: rec.hasta };
    expect(deDocumentoDeRecordatorio(d)).toEqual({ ...rec, dosis: undefined });
  });

  it('un documento incompleto o con fechas dañadas se ignora (null) en vez de romper la sincronización', () => {
    expect(deDocumentoDeRecordatorio({})).toBeNull();
    expect(deDocumentoDeRecordatorio({ visitId: 'c1', itemIndex: 0, medicationName: 'A', frequency: 'Cada 8 horas', firstDoseTime: '08:00' })).toBeNull();
    expect(deDocumentoDeRecordatorio({ visitId: 'c1', itemIndex: 0, medicationName: 'A', frequency: 'Cada 8 horas', firstDoseTime: '08:00', startsAt: 'ayer', endsAt: 'mañana' })).toBeNull();
  });
});

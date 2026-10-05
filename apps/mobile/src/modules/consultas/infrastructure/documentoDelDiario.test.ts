import { describe, expect, it } from 'vitest';

import { deDocumentoDelDiario } from './documentoDelDiario';

describe('deDocumentoDelDiario', () => {
  const fecha = new Date(2026, 8, 28, 11, 0);

  it('traduce una consulta completa', () => {
    const r = deDocumentoDelDiario('v1', {
      visitedAt: { toDate: () => fecha },
      specialty: 'cardiologia',
      visitType: 'especialista',
      doctorName: 'Dra. Mariana Solís',
      placeName: 'Clínica del Sureste',
      reason: 'Revisión de presión',
      doctorNotes: 'Presión un poco alta.',
    });
    expect(r).toEqual({
      id: 'v1',
      fecha,
      especialidad: 'cardiologia',
      tipo: 'especialista',
      medicoNombre: 'Dra. Mariana Solís',
      lugar: 'Clínica del Sureste',
      motivo: 'Revisión de presión',
      notasDelMedico: 'Presión un poco alta.',
    });
  });

  it('los campos opcionales ausentes o nulos quedan sin definir', () => {
    const r = deDocumentoDelDiario('v2', { visitedAt: fecha, specialty: 'otra', visitType: 'otro', doctorName: null, reason: null });
    expect(r).toMatchObject({ medicoNombre: undefined, motivo: undefined, lugar: undefined, notasDelMedico: undefined });
  });

  it('descarta una consulta borrada o sin fecha', () => {
    expect(deDocumentoDelDiario('v3', { visitedAt: fecha, deletedAt: new Date() })).toBeNull();
    expect(deDocumentoDelDiario('v4', { specialty: 'otra' })).toBeNull();
  });

  it('una especialidad o tipo faltante cae en "otra" / "otro"', () => {
    expect(deDocumentoDelDiario('v5', { visitedAt: fecha })).toMatchObject({ especialidad: 'otra', tipo: 'otro' });
  });
});

import { describe, expect, it } from 'vitest';

import { deDocumentoDeConsultaCompleta } from './documentoDeConsultaCompleta';

describe('deDocumentoDeConsultaCompleta', () => {
  const fecha = new Date(2026, 8, 28, 11, 0);
  const proxima = new Date(2026, 9, 19, 10, 30);

  it('traduce una consulta completa', () => {
    const r = deDocumentoDeConsultaCompleta('v1', {
      visitedAt: { toDate: () => fecha },
      specialty: 'cardiologia',
      visitType: 'especialista',
      placeId: 'l1',
      placeName: 'Clínica del Sureste',
      office: '204',
      doctorId: 'm1',
      doctorName: 'Dra. Mariana Solís',
      reason: 'Revisión de presión',
      doctorNotes: 'Presión un poco alta.',
      nextAppointmentAt: { toDate: () => proxima },
    });
    expect(r).toEqual({
      id: 'v1',
      pacienteId: 'self',
      modo: 'presencial',
      tipo: 'especialista',
      especialidad: 'cardiologia',
      fecha,
      medico: { id: 'm1', nombre: 'Dra. Mariana Solís' },
      lugar: { id: 'l1', nombre: 'Clínica del Sureste' },
      consultorio: '204',
      motivo: 'Revisión de presión',
      notasDelMedico: 'Presión un poco alta.',
      indicaciones: [],
      proximaCita: proxima,
    });
  });

  it('un médico o lugar sin id guardado se muestra con su nombre', () => {
    const r = deDocumentoDeConsultaCompleta('v2', { visitedAt: fecha, doctorName: 'Dr. Pech', placeName: 'Hospital Morelos' });
    expect(r?.medico).toEqual({ id: '', nombre: 'Dr. Pech' });
    expect(r?.lugar).toEqual({ id: '', nombre: 'Hospital Morelos' });
  });

  it('un lugar desvinculado (nulo) no aparece', () => {
    const r = deDocumentoDeConsultaCompleta('v3', { visitedAt: fecha, placeId: null, placeName: null });
    expect(r?.lugar).toBeUndefined();
  });

  it('descarta una consulta borrada o sin fecha', () => {
    expect(deDocumentoDeConsultaCompleta('v4', { visitedAt: fecha, deletedAt: new Date() })).toBeNull();
    expect(deDocumentoDeConsultaCompleta('v5', {})).toBeNull();
  });

  it('un tipo o especialidad desconocidos caen en "otro" / "otra"', () => {
    expect(deDocumentoDeConsultaCompleta('v6', { visitedAt: fecha, specialty: 'x', visitType: 'y' })).toMatchObject({ tipo: 'otro', especialidad: 'otra' });
  });
});

import { describe, expect, it } from 'vitest';

import { crearConsulta } from '../domain/Consulta';
import { aDocumentoDeConsulta } from './documentoDeConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);

describe('aDocumentoDeConsulta (formato de Firestore, docs/11)', () => {
  it('una consulta mínima solo lleva los campos obligatorios y deletedAt nulo', () => {
    const r = crearConsulta({ id: 'c1', fecha: new Date(2026, 9, 4, 9, 30), tipo: 'general', especialidad: 'medicina-general' }, ahora);
    if (!r.ok) throw r.error;
    expect(aDocumentoDeConsulta(r.value)).toEqual({
      patientId: 'self',
      specialty: 'medicina-general',
      visitType: 'general',
      visitMode: 'presencial',
      visitedAt: new Date(2026, 9, 4, 9, 30),
      deletedAt: null,
    });
  });

  it('traduce lugar, consultorio, médico, motivo, notas del médico y próxima cita', () => {
    const r = crearConsulta(
      {
        id: 'c1',
        fecha: new Date(2026, 8, 28, 10, 0),
        tipo: 'especialista',
        especialidad: 'cardiologia',
        lugar: { id: 'l1', nombre: 'Clínica del Sureste' },
        consultorio: '204',
        medico: { id: 'm1', nombre: 'Dra. Mariana Solís' },
        motivo: 'Revisión',
        notasDelMedico: 'Bajar la sal',
        proximaCita: new Date(2026, 9, 19, 10, 30),
      },
      ahora,
    );
    if (!r.ok) throw r.error;
    expect(aDocumentoDeConsulta(r.value)).toMatchObject({
      placeId: 'l1',
      placeName: 'Clínica del Sureste',
      office: '204',
      doctorId: 'm1',
      doctorName: 'Dra. Mariana Solís',
      reason: 'Revisión',
      doctorNotes: 'Bajar la sal',
      nextAppointmentAt: new Date(2026, 9, 19, 10, 30),
    });
  });

  it('nunca incluye valores undefined (Firestore los rechaza)', () => {
    const r = crearConsulta({ id: 'c1', fecha: new Date(2026, 9, 4), tipo: 'otro', especialidad: 'otra' }, ahora);
    if (!r.ok) throw r.error;
    expect((Object.values(aDocumentoDeConsulta(r.value)) as unknown[]).includes(undefined)).toBe(false);
  });
});

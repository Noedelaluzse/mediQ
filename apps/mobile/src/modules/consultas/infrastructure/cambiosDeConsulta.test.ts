import { describe, expect, it } from 'vitest';

import { crearConsulta } from '../domain/Consulta';
import { aCambiosDeDocumento } from './cambiosDeConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);

describe('aCambiosDeDocumento (actualizar sin perder ni dejar de más)', () => {
  it('lleva los campos obligatorios y deja en null (= borrar) los opcionales vacíos', () => {
    const r = crearConsulta({ id: 'c1', fecha: new Date(2026, 9, 1, 9, 0), tipo: 'general', especialidad: 'medicina-general' }, ahora);
    if (!r.ok) throw r.error;
    expect(aCambiosDeDocumento(r.value)).toEqual({
      specialty: 'medicina-general',
      visitType: 'general',
      visitedAt: new Date(2026, 9, 1, 9, 0),
      placeId: null,
      placeName: null,
      office: null,
      doctorId: null,
      doctorName: null,
      reason: null,
      doctorNotes: null,
      nextAppointmentAt: null,
    });
  });

  it('con datos los lleva todos', () => {
    const r = crearConsulta(
      {
        id: 'c1',
        fecha: new Date(2026, 8, 28, 10, 0),
        tipo: 'especialista',
        especialidad: 'cardiologia',
        lugar: { id: 'l1', nombre: 'Clínica' },
        consultorio: '204',
        medico: { id: 'm1', nombre: 'Dra. Solís' },
        motivo: 'Revisión',
        notasDelMedico: 'Bajar la sal',
        proximaCita: new Date(2026, 9, 19, 10, 30),
      },
      ahora,
    );
    if (!r.ok) throw r.error;
    expect(aCambiosDeDocumento(r.value)).toMatchObject({
      placeId: 'l1',
      placeName: 'Clínica',
      office: '204',
      doctorId: 'm1',
      doctorName: 'Dra. Solís',
      reason: 'Revisión',
      doctorNotes: 'Bajar la sal',
      nextAppointmentAt: new Date(2026, 9, 19, 10, 30),
    });
  });

  it('nunca toca los campos que no se editan (paciente, modo, fechas de creación, borrado)', () => {
    const r = crearConsulta({ id: 'c1', fecha: new Date(2026, 9, 1), tipo: 'otro', especialidad: 'otra' }, ahora);
    if (!r.ok) throw r.error;
    const claves = Object.keys(aCambiosDeDocumento(r.value));
    for (const intocable of ['patientId', 'visitMode', 'createdAt', 'deletedAt']) expect(claves).not.toContain(intocable);
  });
});

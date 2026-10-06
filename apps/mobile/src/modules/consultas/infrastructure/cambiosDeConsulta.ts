import type { Consulta } from '../domain/Consulta';

/**
 * Los campos de `visits/{id}` que cambian al editar. Un opcional vacío va como `null`, que el repositorio traduce a
 * "borrar el campo". Nunca incluye lo que no se edita (paciente, modo, `createdAt`, `deletedAt`).
 */
export function aCambiosDeDocumento(c: Consulta) {
  return {
    specialty: c.especialidad,
    visitType: c.tipo,
    visitedAt: c.fecha,
    placeId: c.lugar?.id ?? null,
    placeName: c.lugar?.nombre ?? null,
    office: c.consultorio ?? null,
    doctorId: c.medico?.id ?? null,
    doctorName: c.medico?.nombre ?? null,
    reason: c.motivo ?? null,
    doctorNotes: c.notasDelMedico ?? null,
    nextAppointmentAt: c.proximaCita ?? null,
  };
}

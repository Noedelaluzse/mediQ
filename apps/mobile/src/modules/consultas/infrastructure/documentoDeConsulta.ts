import type { Consulta } from '../domain/Consulta';

/** Documento de `mediq_users/{uid}/visits/{id}` (docs/11). Sin valores undefined: Firestore los rechaza. */
export function aDocumentoDeConsulta(c: Consulta) {
  return {
    patientId: c.pacienteId,
    specialty: c.especialidad,
    visitType: c.tipo,
    visitMode: c.modo,
    visitedAt: c.fecha,
    ...(c.lugar ? { placeId: c.lugar.id, placeName: c.lugar.nombre } : {}),
    ...(c.consultorio ? { office: c.consultorio } : {}),
    ...(c.medico ? { doctorId: c.medico.id, doctorName: c.medico.nombre } : {}),
    ...(c.motivo ? { reason: c.motivo } : {}),
    ...(c.notasDelMedico ? { doctorNotes: c.notasDelMedico } : {}),
    ...(c.proximaCita ? { nextAppointmentAt: c.proximaCita } : {}),
    deletedAt: null,
  };
}

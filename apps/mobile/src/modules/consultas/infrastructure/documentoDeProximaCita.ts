import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

import type { ProximaCita } from '../domain/ProximaCita';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoDeProximaCita = {
  nextAppointmentAt?: FechaFirestore | null;
  specialty?: string;
  doctorName?: string | null;
  deletedAt?: unknown;
};

/** null si la consulta está borrada o no tiene próxima cita. */
export function deDocumentoDeProximaCita(id: string, d: DocumentoDeProximaCita): ProximaCita | null {
  const fecha = d.nextAppointmentAt instanceof Date ? d.nextAppointmentAt : d.nextAppointmentAt?.toDate();
  if (d.deletedAt || !fecha) return null;
  return {
    consultaId: id,
    fecha,
    especialidad: ESPECIALIDADES.some((e) => e.slug === d.specialty) && d.specialty ? d.specialty : 'otra',
    medicoNombre: d.doctorName ?? undefined,
  };
}

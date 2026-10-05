import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

import type { Consulta } from '../domain/Consulta';
import { TIPOS_DE_MEDICO } from '../domain/TipoDeMedico';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoDeConsultaCompleta = {
  visitedAt?: FechaFirestore;
  nextAppointmentAt?: FechaFirestore | null;
  specialty?: string;
  visitType?: string;
  placeId?: string | null;
  placeName?: string | null;
  office?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  reason?: string | null;
  doctorNotes?: string | null;
  deletedAt?: unknown;
};

const aFecha = (f?: FechaFirestore | null): Date | undefined => (f instanceof Date ? f : f?.toDate());

/** La consulta completa (sin indicaciones: viven en otra subcolección). null si está borrada o no tiene fecha. */
export function deDocumentoDeConsultaCompleta(id: string, d: DocumentoDeConsultaCompleta): Consulta | null {
  const fecha = aFecha(d.visitedAt);
  if (d.deletedAt || !fecha) return null;
  const tipo = TIPOS_DE_MEDICO.find((t) => t.valor === d.visitType)?.valor ?? 'otro';
  return {
    id,
    pacienteId: 'self',
    modo: 'presencial',
    tipo,
    especialidad: ESPECIALIDADES.some((e) => e.slug === d.specialty) && d.specialty ? d.specialty : 'otra',
    fecha,
    medico: d.doctorName ? { id: d.doctorId ?? '', nombre: d.doctorName } : undefined,
    lugar: d.placeName ? { id: d.placeId ?? '', nombre: d.placeName } : undefined,
    consultorio: d.office ?? undefined,
    motivo: d.reason ?? undefined,
    notasDelMedico: d.doctorNotes ?? undefined,
    indicaciones: [],
    proximaCita: aFecha(d.nextAppointmentAt),
  };
}

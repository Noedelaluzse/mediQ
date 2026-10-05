import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

import type { ConsultaDelDiario } from '../domain/Diario';
import { TIPOS_DE_MEDICO } from '../domain/TipoDeMedico';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoDelDiario = {
  visitedAt?: FechaFirestore;
  specialty?: string;
  visitType?: string;
  doctorName?: string | null;
  placeName?: string | null;
  reason?: string | null;
  doctorNotes?: string | null;
  deletedAt?: unknown;
};

/** null si la consulta está borrada o no tiene fecha. */
export function deDocumentoDelDiario(id: string, d: DocumentoDelDiario): ConsultaDelDiario | null {
  const fecha = d.visitedAt instanceof Date ? d.visitedAt : d.visitedAt?.toDate();
  if (d.deletedAt || !fecha) return null;
  return {
    id,
    fecha,
    especialidad: ESPECIALIDADES.some((e) => e.slug === d.specialty) && d.specialty ? d.specialty : 'otra',
    tipo: TIPOS_DE_MEDICO.some((t) => t.valor === d.visitType) && d.visitType ? d.visitType : 'otro',
    medicoNombre: d.doctorName ?? undefined,
    lugar: d.placeName ?? undefined,
    motivo: d.reason ?? undefined,
    notasDelMedico: d.doctorNotes ?? undefined,
  };
}

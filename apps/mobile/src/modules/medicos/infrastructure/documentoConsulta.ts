import type { ConsultaDeMedico } from '../domain/Consultas';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoConsulta = {
  visitedAt?: FechaFirestore;
  placeName?: string | null;
  reason?: string | null;
  deletedAt?: unknown;
};

export const aFecha = (f?: FechaFirestore): Date | undefined => (f instanceof Date ? f : f?.toDate());

/** null si la consulta está borrada o no tiene fecha. */
export function deDocumentoConsulta(id: string, d: DocumentoConsulta): ConsultaDeMedico | null {
  const fecha = aFecha(d.visitedAt);
  if (d.deletedAt || !fecha) return null;
  return { id, fecha, lugar: d.placeName ?? undefined, motivo: d.reason ?? undefined };
}

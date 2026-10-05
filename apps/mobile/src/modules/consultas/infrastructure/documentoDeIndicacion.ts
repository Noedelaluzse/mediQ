import type { Indicacion } from '../domain/Indicacion';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoDeIndicacion = { sortOrder?: number; body?: string; doneAt?: FechaFirestore | null };

/** Documento de `visits/{id}/instructions/{id}` (docs/11). `doneAt` nulo = pendiente. */
export const aDocumentoDeIndicacion = (i: Indicacion) => ({ sortOrder: i.orden, body: i.texto, doneAt: i.hechaEn ?? null });

export function deDocumentoDeIndicacion(id: string, d: DocumentoDeIndicacion): Indicacion | null {
  if (!d.body?.trim()) return null;
  const hechaEn = d.doneAt instanceof Date ? d.doneAt : d.doneAt?.toDate();
  return { id, texto: d.body, orden: d.sortOrder ?? Number.MAX_SAFE_INTEGER, hechaEn };
}

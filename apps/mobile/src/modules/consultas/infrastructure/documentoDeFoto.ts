import type { FotoDeReceta } from '../domain/FotoDeReceta';

export type DocumentoDeFoto = { storagePath?: string; mimeType?: string; sizeBytes?: number; width?: number | null; height?: number | null };

/** Ruta del archivo en Storage: una foto por receta, siempre JPEG (la app comprime a JPEG antes de subir). */
export const rutaDeFotoDeReceta = (usuarioId: string, consultaId: string) => `mediq_users/${usuarioId}/visits/${consultaId}/receta.jpg`;

/** Documento de `attachments/foto` (docs/11): solo la ruta en Storage, nunca una URL. */
export const aDocumentoDeFoto = (f: FotoDeReceta, ruta: string) => ({
  storagePath: ruta,
  mimeType: f.tipoMime,
  sizeBytes: f.bytes,
  width: f.ancho ?? null,
  height: f.alto ?? null,
});

export function deDocumentoDeFoto(d: DocumentoDeFoto): FotoDeReceta | null {
  if (!d.storagePath || d.mimeType !== 'image/jpeg' || typeof d.sizeBytes !== 'number') return null;
  return { tipoMime: 'image/jpeg', bytes: d.sizeBytes, ancho: d.width ?? undefined, alto: d.height ?? undefined };
}

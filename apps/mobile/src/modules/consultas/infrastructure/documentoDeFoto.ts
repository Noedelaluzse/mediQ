import type { FotoDeReceta } from '../domain/FotoDeReceta';

/** Lo que Firestore entrega de una fecha (`Timestamp`): solo se usa su valor en milisegundos. */
type MarcaDeTiempo = { toMillis(): number } | null | undefined;

export type DocumentoDeFoto = {
  storagePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  createdAt?: MarcaDeTiempo;
  updatedAt?: MarcaDeTiempo;
};

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

/**
 * Identifica «esta» foto de la consulta: cambia cada vez que se reemplaza. Sin `updatedAt` (fotos anteriores a F051) vale `createdAt`.
 * Solo el tamaño no basta: dos fotos distintas pueden pesar lo mismo y la caché enseñaría la vieja. Lleva también las dimensiones:
 * sin internet no se puede leer el documento y se necesitan para dibujar la foto (`datosDeVersion`).
 */
export const versionDeFoto = (d: Pick<DocumentoDeFoto, 'sizeBytes' | 'createdAt' | 'updatedAt' | 'width' | 'height'>): string =>
  `${d.sizeBytes ?? 0}-${d.updatedAt?.toMillis() ?? d.createdAt?.toMillis() ?? 0}-${d.width ?? 0}x${d.height ?? 0}`;

/** Lo que se puede recuperar de una versión guardada en la caché (tamaño y dimensiones); null si no se entiende. */
export function datosDeVersion(version: string): { bytes: number; ancho?: number; alto?: number } | null {
  const m = /^(\d+)-\d+-(\d+)x(\d+)$/.exec(version);
  if (!m) return null;
  const [bytes, ancho, alto] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return { bytes, ancho: ancho > 0 ? ancho : undefined, alto: alto > 0 ? alto : undefined };
}

const seguro = (texto: string) => texto.replace(/[^A-Za-z0-9_-]/g, '-');

/** Nombre de la foto en la caché: la cuenta y la consulta van por delante, así otra cuenta nunca lee esta foto. */
export const claveDeCache = (usuarioId: string, consultaId: string, version: string) => `${prefijoDeCache(usuarioId, consultaId)}${seguro(version)}`;

/** Todas las versiones de la foto de una consulta empiezan igual (el `_` del final evita confundir `c9` con `c99`). */
export const prefijoDeCache = (usuarioId: string, consultaId: string) => `${seguro(usuarioId)}_${seguro(consultaId)}_`;

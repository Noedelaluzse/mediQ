import { err, ok, type Result } from '@/shared/kernel/Result';

import { FotoInvalidaError } from './errors';

export const LIMITE_DE_BYTES_DE_FOTO = 5 * 1024 * 1024;

/** Datos de la foto de la receta (RF-30). Una por receta; el archivo vive en Storage. */
export interface FotoDeReceta {
  tipoMime: 'image/jpeg';
  bytes: number;
  ancho?: number;
  alto?: number;
}

const esDimension = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n > 0);

export function crearFotoDeReceta(d: { tipoMime: string; bytes: number; ancho?: number; alto?: number }): Result<FotoDeReceta, FotoInvalidaError> {
  if (d.tipoMime !== 'image/jpeg') return err(new FotoInvalidaError());
  if (!Number.isInteger(d.bytes) || d.bytes <= 0 || d.bytes > LIMITE_DE_BYTES_DE_FOTO) return err(new FotoInvalidaError());
  if (!esDimension(d.ancho) || !esDimension(d.alto)) return err(new FotoInvalidaError());
  return ok({ tipoMime: 'image/jpeg', bytes: d.bytes, ancho: d.ancho, alto: d.alto });
}

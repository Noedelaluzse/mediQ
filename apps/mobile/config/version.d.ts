export interface InfoDeVersion {
  version: string;
  commit?: string;
  compilacion: number;
}
export function calcularVersion(asuntos: string[]): { version: string; features: number; otros: number; compilacion: number };
export function obtenerVersion(opciones?: {
  git?: () => { asuntos: string[]; commit: string };
  leer?: () => InfoDeVersion | null;
}): InfoDeVersion;
export function desdeGit(cwd?: string): { asuntos: string[]; commit: string };
export const ARCHIVO_GENERADO: string;

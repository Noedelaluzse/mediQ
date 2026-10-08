/** Cómo se elige el tema: seguir al teléfono o forzar uno. */
export type PreferenciaDeTema = 'automatico' | 'claro' | 'oscuro';
export type ModoDelTema = 'claro' | 'oscuro';

export const PREFERENCIAS_DE_TEMA: readonly PreferenciaDeTema[] = ['automatico', 'claro', 'oscuro'];

/** Lee lo guardado; cualquier cosa rara (nada, texto dañado, otro valor) cuenta como automático. */
export function leerPreferenciaDeTema(crudo: string | null): PreferenciaDeTema {
  return PREFERENCIAS_DE_TEMA.find((p) => p === crudo) ?? 'automatico';
}

/** Qué tema se ve: el forzado, o el del teléfono (claro si no se sabe). */
export function temaEfectivo(preferencia: PreferenciaDeTema, sistema: string | null | undefined): ModoDelTema {
  if (preferencia !== 'automatico') return preferencia;
  return sistema === 'dark' ? 'oscuro' : 'claro';
}

/** Lo que se le pide al sistema para que teclado, alertas y barra de estado combinen; `unspecified` lo suelta (sigue al teléfono). */
export function esquemaNativo(preferencia: PreferenciaDeTema): 'light' | 'dark' | 'unspecified' {
  if (preferencia === 'claro') return 'light';
  if (preferencia === 'oscuro') return 'dark';
  return 'unspecified';
}

/** Dónde se guarda la elección: es del teléfono, no de la cuenta. */
export interface AlmacenDePreferenciaDeTema {
  leer(): Promise<PreferenciaDeTema>;
  guardar(preferencia: PreferenciaDeTema): Promise<void>;
}

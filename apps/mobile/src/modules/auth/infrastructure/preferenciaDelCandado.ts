import { preferenciaInicial, type PreferenciaDelCandado } from '../domain/Candado';

/** Lee lo guardado; cualquier cosa rara (nada, texto dañado, otra forma) cuenta como candado apagado y sin ofrecer. */
export function leerPreferencia(crudo: string | null): PreferenciaDelCandado {
  if (!crudo) return preferenciaInicial();
  try {
    const dato: unknown = JSON.parse(crudo);
    if (typeof dato !== 'object' || dato === null) return preferenciaInicial();
    const { activado, ofrecido } = dato as Record<string, unknown>;
    if (typeof activado !== 'boolean') return preferenciaInicial();
    return { activado, ofrecido: ofrecido === true };
  } catch {
    return preferenciaInicial();
  }
}

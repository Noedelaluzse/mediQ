import { preferenciaInicial, type PreferenciaDelCandado } from '../domain/Candado';

/** Lo guardado del candado existe pero no se entiende (F072): no se puede saber si estaba activado, así que NO se da por apagado. */
export class PreferenciaDelCandadoIlegibleError extends Error {
  constructor() {
    super('la preferencia del candado está dañada');
    this.name = 'PreferenciaDelCandadoIlegibleError';
  }
}

/** Lee lo guardado: nada guardado = candado apagado y sin ofrecer; algo guardado que no se entiende (texto dañado, otra forma) = error. */
export function leerPreferencia(crudo: string | null): PreferenciaDelCandado {
  if (crudo === null) return preferenciaInicial();
  let dato: unknown;
  try {
    dato = JSON.parse(crudo);
  } catch {
    throw new PreferenciaDelCandadoIlegibleError();
  }
  if (typeof dato !== 'object' || dato === null) throw new PreferenciaDelCandadoIlegibleError();
  const { activado, ofrecido } = dato as Record<string, unknown>;
  if (typeof activado !== 'boolean') throw new PreferenciaDelCandadoIlegibleError();
  return { activado, ofrecido: ofrecido === true };
}

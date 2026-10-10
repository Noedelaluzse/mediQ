/** Cuánto tiempo se considera «reciente» lo que ya se cargó: pasado este tiempo se vuelve a leer, por si cambió en otro aparato (P-06). */
export const VIGENCIA_DE_DATOS_MS = 60_000;

/** Lo que se sabía al cargar los datos de una pantalla. */
export interface UltimaCarga {
  cuando: number;
  version: number;
  hayInternet: boolean;
}

/**
 * ¿Hay que volver a leer los datos al volver a una pantalla? Antes se leían SIEMPRE (más lecturas a Firebase y, en el Diario, se
 * perdía el lugar de la lista). Ahora solo si: nunca se cargaron, algo se guardó/editó/borró en la app (`version`), cambió la
 * conexión (lo leído pudo ser una copia vieja), o pasó la vigencia.
 */
export function necesitaRecargar(ultima: UltimaCarga | null, actual: { version: number; hayInternet: boolean; ahora: number }, vigenciaMs = VIGENCIA_DE_DATOS_MS): boolean {
  if (ultima === null) return true;
  if (actual.version !== ultima.version) return true;
  if (actual.hayInternet !== ultima.hayInternet) return true;
  const transcurrido = actual.ahora - ultima.cuando;
  // Un reloj que retrocedió no permite saber cuánto pasó: mejor leer de nuevo.
  return transcurrido < 0 || transcurrido >= vigenciaMs;
}

/** Cuánto se reusa la lista completa del Diario para buscar (F071): leerla es lo más caro de la app, así que dura más que la vigencia normal. */
export const VIGENCIA_DE_BUSQUEDA_MS = 5 * 60_000;

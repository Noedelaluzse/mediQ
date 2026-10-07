/** Cuánto se puede acercar con los dedos (iPhone). Una receta con letra pequeña pide acercarse bastante, pero no sin límite. */
export const ZOOM_MAXIMO = 5;

/** Proporción que se supone cuando no se conocen las medidas de la foto (las anteriores a guardar el ancho y el alto): vertical 3:4. */
const PROPORCION_POR_DEFECTO = 3 / 4;

/**
 * Cómo cabe una foto completa en la pantalla sin recortarla ni deformarla («contener»): se ajusta al ancho o al alto, lo que llegue
 * primero. Con una pantalla sin medir todavía (0) devuelve 0 en vez de números sin sentido.
 */
export function ajustarAPantalla(foto: { ancho?: number; alto?: number }, pantalla: { ancho: number; alto: number }): { ancho: number; alto: number } {
  if (pantalla.ancho <= 0 || pantalla.alto <= 0) return { ancho: 0, alto: 0 };
  const proporcion = foto.ancho && foto.alto ? foto.ancho / foto.alto : PROPORCION_POR_DEFECTO;
  const alto = Math.min(pantalla.alto, pantalla.ancho / proporcion);
  return { ancho: alto * proporcion, alto };
}

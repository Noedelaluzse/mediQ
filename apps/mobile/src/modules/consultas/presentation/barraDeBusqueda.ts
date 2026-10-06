/** Cuánto hay que arrastrar la lista hacia abajo (más allá del tope) y soltar para que aparezca la barra. */
export const UMBRAL_PARA_MOSTRAR = 48;
/** Cuánto hay que bajar la lista para que la barra vuelva a ocultarse. */
export const UMBRAL_PARA_OCULTAR = 24;

/**
 * La barra de búsqueda está oculta y aparece con el rebote de arrastrar la lista hacia abajo (como la búsqueda de iOS);
 * al bajar la lista vuelve a ocultarse. `mantener` es verdadero mientras haya texto escrito o el campo esté en uso: entonces
 * nunca se oculta. `y` es el desplazamiento de la lista (negativo = rebote de arriba).
 * Devuelve true para mostrarla, false para ocultarla, o null si no hay que cambiar nada.
 */
export function visibilidadDeLaBarra(d: { y: number; visible: boolean; mantener: boolean; alSoltar: boolean }): boolean | null {
  if (d.mantener) return d.visible ? null : true;
  if (!d.visible) return d.alSoltar && d.y <= -UMBRAL_PARA_MOSTRAR ? true : null;
  return d.y >= UMBRAL_PARA_OCULTAR ? false : null;
}

import { aEntradas, esFilaSinTocar, type FilaDeMedicamento } from './receta';

/**
 * Qué hacer al quitar algo de la receta (F050). «Quitar» borraba la fila al instante y, al guardar con la lista vacía, la receta
 * se borraba y la pantalla se cerraba sin decir nada. Ahora se pregunta antes y se avisa cuando ya pasó.
 *  - `quitar`: una fila sin tocar; no hay nada que perder.
 *  - `confirmar`: una fila con algo escrito; se pregunta y se quita de la lista (se guarda al tocar «Guardar receta»).
 *  - `quitar-receta`: era el último medicamento de una receta ya guardada, así que se borra la receta completa (con su pregunta).
 */
export type AccionAlQuitarFila = 'quitar' | 'confirmar' | 'quitar-receta';

export function accionAlQuitarFila(filas: FilaDeMedicamento[], indice: number, habiaReceta: boolean): AccionAlQuitarFila {
  const resto = filas.filter((_, n) => n !== indice);
  if (habiaReceta && aEntradas(resto).length === 0) return 'quitar-receta';
  return esFilaSinTocar(filas[indice]) ? 'quitar' : 'confirmar';
}

/** Guardar con la lista vacía sobre una receta guardada la borra: antes de hacerlo se confirma. */
export function accionAlGuardar(filas: FilaDeMedicamento[], habiaReceta: boolean): 'guardar' | 'quitar-receta' {
  return habiaReceta && aEntradas(filas).length === 0 ? 'quitar-receta' : 'guardar';
}

export const TEXTOS_AL_QUITAR = {
  /** `guardada`: la receta ya existe en la cuenta, así que quitar el medicamento solo se confirma al guardar. */
  fila: (guardada: boolean) => ({
    titulo: '¿Quitar este medicamento?',
    mensaje: guardada ? 'Se quita de la lista. Toca «Guardar receta» para confirmar el cambio.' : 'Se quita de la lista.',
  }),
  receta: { titulo: '¿Quitar la receta?', mensaje: 'Se borrará la receta de esta consulta y también sus avisos de toma.' },
  hecho: { titulo: 'Receta quitada', mensaje: 'Ya no hay receta en esta consulta.' },
  fallo: { titulo: 'No pudimos quitar la receta', mensaje: 'Revisa tu conexión e inténtalo de nuevo.' },
} as const;

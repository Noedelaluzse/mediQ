/** Textos al subir la foto de la receta (F056): se avisa mientras se sube y cuando ya quedó guardada (antes no se decía nada en ningún momento). */
export const TEXTOS_AL_SUBIR_FOTO = {
  subiendo: 'Subiendo la foto…',
  /** `reemplazo`: ya había una foto en la consulta. */
  hecho: (reemplazo: boolean) => ({
    titulo: reemplazo ? 'Foto reemplazada' : 'Foto guardada',
    mensaje: reemplazo ? 'La nueva foto ya quedó en la receta de esta consulta.' : 'La foto ya quedó en la receta de esta consulta.',
  }),
} as const;

/** Textos al quitar la foto de la receta (F055): se pregunta antes de borrar y se avisa cuando ya pasó (la foto desaparecía sin decir nada). */
export const TEXTOS_AL_QUITAR_FOTO = {
  confirmar: { titulo: '¿Quitar la foto?', mensaje: 'Se va a borrar de tu cuenta y de este teléfono.' },
  hecho: { titulo: 'Foto quitada', mensaje: 'Ya no hay foto en la receta de esta consulta.' },
  fallo: { titulo: 'No pudimos quitar la foto', mensaje: 'Revisa tu conexión e inténtalo de nuevo.' },
} as const;

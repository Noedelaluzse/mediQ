/** Lo que se le dice al usuario cuando una opción de editar está desactivada por no haber internet. Una sola frase para toda la app. */
export const MENSAJE_SIN_CONEXION = 'Sin conexión. Puedes ver lo que ya abriste, pero para editar o eliminar necesitas internet.';

/** Por qué no se puede editar ahora; null si se puede (hay internet). Capturar una consulta nueva sí se puede sin internet (F030). */
export const motivoSinEdicion = (hayInternet: boolean): string | null => (hayInternet ? null : MENSAJE_SIN_CONEXION);

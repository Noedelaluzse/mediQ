/** La pantalla de aceptación pide dos casillas independientes: el aviso de privacidad (con consentimiento expreso para datos de salud) y los términos. */
export const TEXTO_DE_ACEPTACION_DEL_AVISO =
  'Leí el aviso de privacidad y doy mi consentimiento expreso para que mis datos personales, incluidos mis datos sensibles de salud, se traten como ahí se explica.';
export const TEXTO_DE_ACEPTACION_DE_TERMINOS = 'Leí y acepto los términos y condiciones.';

/** Solo se puede continuar con las dos aceptadas. */
export const puedeContinuar = (marcadas: { aviso: boolean; terminos: boolean }): boolean => marcadas.aviso && marcadas.terminos;

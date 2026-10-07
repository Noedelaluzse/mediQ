export function destinoPostLogin(resultado: { consentimientoPendiente: boolean }): '/privacidad' | '/' {
  return resultado.consentimientoPendiente ? '/privacidad' : '/';
}

/**
 * Con qué pantalla del grupo de acceso abre la app. Si ya hay sesión pero cambió un texto legal (hay que aceptarlo de nuevo), abre la
 * aceptación; si no, el login. Sin esto, una cuenta ya iniciada vería el login cada vez que se suba la versión de los textos.
 */
export const rutaInicialDeAcceso = (estado: string): 'privacidad' | 'login' => (estado === 'avisoPendiente' ? 'privacidad' : 'login');

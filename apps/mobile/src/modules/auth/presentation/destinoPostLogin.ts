export function destinoPostLogin(resultado: { consentimientoPendiente: boolean }): '/privacidad' | '/' {
  return resultado.consentimientoPendiente ? '/privacidad' : '/';
}

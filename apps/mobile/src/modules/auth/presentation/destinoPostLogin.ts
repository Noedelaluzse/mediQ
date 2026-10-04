export function destinoPostLogin(sesion: { primeraVez: boolean }): '/privacidad' | '/' {
  return sesion.primeraVez ? '/privacidad' : '/';
}

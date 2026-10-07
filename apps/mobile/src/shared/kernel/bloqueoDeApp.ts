/**
 * Si la pantalla de bloqueo (F036) tapa la app. Lo publica el candado y lo leen las pantallas que se dibujan fuera de la app
 * (los `Modal`, como el visor de la foto), que de otro modo quedarían por encima del bloqueo.
 */
let bloqueada = false;
const oyentes = new Set<() => void>();

export const appEstaBloqueada = (): boolean => bloqueada;

export function publicarBloqueo(valor: boolean): void {
  if (valor === bloqueada) return;
  bloqueada = valor;
  oyentes.forEach((avisar) => avisar());
}

export function suscribirseAlBloqueo(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => void oyentes.delete(oyente);
}

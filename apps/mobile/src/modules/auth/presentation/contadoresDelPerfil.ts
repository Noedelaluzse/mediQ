/**
 * Qué se escribe en un contador del Perfil: el número, un guion si no se pudo leer (y no hay copia) o nada mientras carga.
 * Antes, si la lectura fallaba se mostraba un «0» que parecía un dato (F053); un 0 solo se muestra si de verdad es 0.
 */
export function textoDelContador(valor: number | undefined, noDisponible: boolean): string | null {
  if (valor !== undefined) return String(valor);
  return noDisponible ? '—' : null;
}

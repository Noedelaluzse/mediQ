/** Medidas en píxeles de `assets/images/logo-horizontal.png` (las vigila `logo.test.ts`). */
export const LOGO_HORIZONTAL = { ancho: 720, alto: 166 } as const;

/**
 * Ancho y alto explícitos para dibujar el logo a un ancho dado. Se usan en vez de `aspectRatio` porque en iOS el logo se pintaba
 * a su tamaño original (720 puntos) y la pantalla lo recortaba. Nunca más grande que la imagen (se vería borroso).
 */
export function tamanoDelLogo(anchoDeseado: number): { width: number; height: number } {
  const width = Math.min(Math.round(anchoDeseado), LOGO_HORIZONTAL.ancho);
  return { width, height: Math.max(1, Math.round((width * LOGO_HORIZONTAL.alto) / LOGO_HORIZONTAL.ancho)) };
}

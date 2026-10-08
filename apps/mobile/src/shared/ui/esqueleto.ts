/** Un esqueleto se muestra mientras no llegan los datos y no hay error (si falló, aparece el error con «Reintentar»). */
export const estaCargando = (datos: unknown, fallo: boolean): boolean => (datos === null || datos === undefined) && !fallo;

/**
 * Parpadeo suave de los bloques: de medio opaco a opaco y de vuelta. Tiene tope (`maxMs`, P-15): un parpadeo en bucle mantiene al
 * iPhone trabajando (≈ 12 % de CPU en una medición), así que si una carga se cuelga, a los 10 s el bloque queda quieto en `reposo`.
 * `reposo` también es lo que se ve con «reducir movimiento» activado.
 */
export const PULSO = { desde: 0.5, hasta: 1, duracionMs: 800, maxMs: 10_000, reposo: 0.75 } as const;

const ANCHOS = ['78%', '92%', '56%', '84%', '45%', '70%'] as const;

/** Anchos distintos para las líneas de texto de un esqueleto (determinista: no cambia en cada pintado). */
export const anchosDeTexto = (lineas: number): string[] => Array.from({ length: lineas }, (_, i) => ANCHOS[i % ANCHOS.length]);

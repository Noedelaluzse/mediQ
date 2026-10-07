type Salida = (...argumentos: unknown[]) => void;

/**
 * Avisos para quien programa: qué falló en segundo plano (avisos, sincronizaciones, guardados que la pantalla ya explica al usuario).
 * Solo se escriben en desarrollo: en la app publicada no se imprime nada, porque un error de Firebase puede traer rutas o ids de la
 * cuenta y nadie los va a leer en el teléfono. `activo` se consulta al escribir, no al crear.
 */
export function crearDiagnostico(activo: () => boolean, salida: Salida = console.warn) {
  const escribir = (mensaje: string, detalle: unknown[]) => {
    if (activo()) salida(`[MediQ] ${mensaje}`, ...detalle);
  };
  return {
    advertir: (mensaje: string, ...detalle: unknown[]) => escribir(mensaje, detalle),
    informar: (mensaje: string, ...detalle: unknown[]) => escribir(mensaje, detalle),
  };
}

/** `__DEV__` lo define React Native; en las pruebas de Node no existe y cuenta como «no desarrollo». */
export const diagnostico = crearDiagnostico(() => typeof __DEV__ !== 'undefined' && __DEV__);

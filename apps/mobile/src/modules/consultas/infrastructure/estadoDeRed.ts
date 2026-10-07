/** Lo que se usa del estado de red de la librería (así se prueba sin la librería nativa). */
export interface EstadoDeRed {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}

/** Hay red y salida a internet. Si aún no se sabe si hay salida (`null`), se intenta: peor sería no enviar nunca. */
export const hayInternet = (e: EstadoDeRed): boolean => e.isConnected === true && e.isInternetReachable !== false;

export type OrigenDeFoto = 'camara' | 'galeria';

/** Foto ya reducida y comprimida, lista para subir. */
export type FotoElegida = { base64: string; tipoMime: string; bytes: number; ancho: number; alto: number };

export type ResultadoDeSeleccion =
  | { estado: 'elegida'; foto: FotoElegida }
  | { estado: 'cancelada' }
  | { estado: 'permiso-denegado'; puedePreguntar: boolean };

/** Cámara o galería del teléfono (implementado con expo-image-picker). */
export interface SelectorDeFoto {
  elegir(origen: OrigenDeFoto): Promise<ResultadoDeSeleccion>;
}

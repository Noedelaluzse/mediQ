/**
 * Copia en el teléfono de la foto de la receta (F051): se baja de Storage una vez y las siguientes lecturas salen del teléfono.
 * Es una caché, no un respaldo: el sistema puede borrarla cuando necesite espacio y la foto se vuelve a bajar. Es un dato de salud,
 * así que se vacía al cerrar sesión y al eliminar la cuenta (RNF-07), y cada archivo lleva la cuenta en su nombre.
 */
export interface CacheDeFotos {
  /** La `uri` de la foto guardada con esa clave; null si no está. */
  obtener(clave: string): Promise<string | null>;
  /** Guarda la imagen y devuelve la `uri` lista para mostrar. */
  guardar(clave: string, bytes: Uint8Array): Promise<string>;
  /** Borra todas las versiones guardadas cuya clave empiece con el prefijo (las de una consulta). */
  quitarDe(prefijo: string): Promise<void>;
  /** La foto guardada de una consulta (la última versión) con su clave; null si no hay. Sirve para verla sin internet. */
  ultimaDe(prefijo: string): Promise<{ clave: string; uri: string } | null>;
  /** Borra todo. */
  limpiar(): Promise<void>;
}

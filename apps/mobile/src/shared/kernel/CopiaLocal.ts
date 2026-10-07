/** Copia de lectura en el teléfono (por usuario): lo último que se vio, para poder leerlo sin internet (RNF-11). Guarda texto. */
export interface CopiaLocal {
  guardar(clave: string, contenido: string): Promise<void>;
  leer(clave: string): Promise<string | null>;
  /** Borra toda la copia de este usuario (al cerrar sesión o eliminar la cuenta). */
  limpiar(): Promise<void>;
}

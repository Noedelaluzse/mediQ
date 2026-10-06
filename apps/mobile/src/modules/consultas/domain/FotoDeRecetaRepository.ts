import type { FotoDeReceta } from './FotoDeReceta';

/** Foto de la receta de una consulta (una sola): archivo en Storage, datos en `prescriptions/receta/attachments/foto`. */
export interface FotoDeRecetaRepository {
  /** La foto con una `uri` lista para mostrar (datos de la imagen); null si no hay. */
  obtener(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null>;
  /** Crea o reemplaza la foto. `base64` es el contenido del JPEG. */
  guardar(consultaId: string, foto: FotoDeReceta, base64: string): Promise<void>;
  /** Borra archivo y datos; no falla si no había. */
  quitar(consultaId: string): Promise<void>;
}

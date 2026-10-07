/**
 * La foto de la receta sin internet (F051): se ve la copia guardada en el teléfono si existe; si no, no está disponible. Con la copia
 * no se puede reemplazar ni quitar la foto (editar necesita internet, F032) y se avisa que puede no ser la última versión.
 */
export type EstadoDeLaFoto = 'normal' | 'copia' | 'no-disponible';

export function estadoDeLaFoto({ puedeEditar, hayFoto }: { puedeEditar: boolean; hayFoto: boolean }): EstadoDeLaFoto {
  if (puedeEditar) return 'normal';
  return hayFoto ? 'copia' : 'no-disponible';
}

export const TEXTOS_FOTO_SIN_INTERNET = {
  copia: 'Sin internet: esta es la copia guardada en tu teléfono y puede no ser la más reciente.',
  noDisponible: 'La foto de la receta no está disponible sin internet hasta que la veas una vez con conexión.',
} as const;

import { motivoSinEdicion } from '@/shared/kernel/sinConexion';

import { useHayInternet } from './useHayInternet';

/**
 * ¿Se puede editar ahora? Editar, eliminar y guardar cambios necesitan internet (F032): sin él, esas opciones se desactivan y la
 * pantalla muestra `motivo`. Capturar una consulta nueva NO pasa por aquí: se guarda sin internet y se envía sola (F030).
 */
export function useEdicion(): { puedeEditar: boolean; motivo: string | null } {
  const motivo = motivoSinEdicion(useHayInternet());
  return { puedeEditar: motivo === null, motivo };
}

import type { Indicacion } from './Indicacion';

/** Indicaciones de una consulta: `mediq_users/{uid}/visits/{consultaId}/instructions/{id}`. */
export interface IndicacionesRepository {
  /** Todas las de la consulta, sin garantizar el orden. */
  listar(consultaId: string): Promise<Indicacion[]>;
  /** Crea o reemplaza una indicación (agregar y marcar usan lo mismo). */
  guardar(consultaId: string, indicacion: Indicacion): Promise<void>;
  quitar(consultaId: string, indicacionId: string): Promise<void>;
}

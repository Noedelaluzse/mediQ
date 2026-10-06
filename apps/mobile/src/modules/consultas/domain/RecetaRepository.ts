import type { Medicamento } from './Receta';

/** Receta de una consulta: `mediq_users/{uid}/visits/{consultaId}/prescriptions/receta` (una por consulta). */
export interface RecetaRepository {
  /** Medicamentos en el orden guardado; vacío si no hay receta. */
  obtener(consultaId: string): Promise<Medicamento[]>;
  /** Crea o reemplaza la receta completa. */
  guardar(consultaId: string, medicamentos: Medicamento[]): Promise<void>;
  quitar(consultaId: string): Promise<void>;
}

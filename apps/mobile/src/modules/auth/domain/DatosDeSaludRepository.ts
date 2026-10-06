import type { DatosDeSalud } from './DatosDeSalud';

/** Datos de salud del propio usuario: viven en `mediq_users/{uid}/patients/self` (docs/11). */
export interface DatosDeSaludRepository {
  obtener(): Promise<DatosDeSalud>;
  /** Reemplaza los datos de salud (lo que no viene se quita). */
  guardar(datos: DatosDeSalud): Promise<void>;
}

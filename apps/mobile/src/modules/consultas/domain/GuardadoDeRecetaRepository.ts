import type { Medicamento } from './Receta';
import type { RecordatorioDeToma } from './Toma';

/**
 * Guardar la receta de una consulta como UNA sola operación (AUD-03, F064): la receta, la marca `hasPrescription` de su consulta y los
 * recordatorios de toma quedan juntos o no queda ninguno. Antes eran dos pasos seguidos y, si el segundo fallaba, quedaba la receta nueva
 * con los recordatorios viejos.
 */
export interface GuardadoDeRecetaRepository {
  /**
   * Reemplaza la receta, su marca y TODOS los recordatorios de la consulta de una sola vez. Con la lista de medicamentos vacía quita la
   * receta, baja la marca y borra todos sus recordatorios. Si falla, no queda nada a medias.
   */
  guardar(consultaId: string, medicamentos: Medicamento[], recordatorios: RecordatorioDeToma[]): Promise<void>;
}

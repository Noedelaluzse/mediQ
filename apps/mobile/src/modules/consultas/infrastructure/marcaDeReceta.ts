/**
 * Qué escribir en `hasPrescription` cuando se guarda (o se REescribe) una consulta (AUD-13, F060). La marca le dice al Perfil si la
 * consulta tiene receta sin abrir la receta (F048).
 *  - La consulta no existía: nace sin receta, `false`. Antes nacía sin marca y el Perfil debía leer su receta y escribirla.
 *  - Ya existía con marca (reenvío de la cola de envío, que reescribe la misma consulta): se CONSERVA. Bajar un `true` a `false`
 *    haría que el Perfil contara de menos para siempre.
 *  - Ya existía sin marca (anterior a F048) o con una marca dañada: no se escribe nada; el Perfil la rellena leyendo su receta.
 */
export function marcaAlGuardarConsulta(existente: { hasPrescription?: unknown } | null | undefined): { hasPrescription: boolean } | Record<string, never> {
  if (!existente) return { hasPrescription: false };
  return typeof existente.hasPrescription === 'boolean' ? { hasPrescription: existente.hasPrescription } : {};
}

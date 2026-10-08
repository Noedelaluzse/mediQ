/**
 * Relleno de la marca `hasPrescription` de una consulta anterior a F048 (AUD-13, F060). Se decide DENTRO de una transacción, con la
 * consulta y su receta leídas a la vez: si mientras tanto alguien guardó una receta (la marca ya es booleana) no se escribe nada,
 * y un resultado leído antes no pisa uno más reciente. `null` = no hay nada que escribir.
 */
export function marcaARellenar(consulta: { hasPrescription?: unknown }, existeReceta: boolean): { hasPrescription: boolean } | null {
  return typeof consulta.hasPrescription === 'boolean' ? null : { hasPrescription: existeReceta };
}

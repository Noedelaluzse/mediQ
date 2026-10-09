/**
 * Junta hasta `cuantos` elementos válidos pidiendo páginas de `tamanoDePagina` documentos hasta lograrlo o agotar los documentos (AUD-12, F067).
 *
 * Las consultas borradas se descartan en el teléfono (`convertir` devuelve null) para no exigir un índice compuesto en Firestore. Pedir UNA sola
 * página y descartar después pierde a las vigentes que venían más allá: con 10 borradas primero, la cita vigente que seguía nunca se leía.
 * No hay tope de páginas: lo que se recorre es solo lo que cumple el filtro de la consulta (citas futuras), no todo el historial. Cada petición
 * recibe el último documento de la anterior (`startAfter`), así que no se repite ni se salta ninguno.
 */
export async function reunirVigentes<D, T>(o: { tamanoDePagina: number; cuantos: number; pedir: (despuesDe: D | undefined) => Promise<D[]>; convertir: (documento: D) => T | null }): Promise<T[]> {
  const juntas: T[] = [];
  let despuesDe: D | undefined;
  while (juntas.length < o.cuantos) {
    const pagina = await o.pedir(despuesDe);
    for (const documento of pagina) {
      const elemento = o.convertir(documento);
      if (elemento !== null) juntas.push(elemento);
      if (juntas.length >= o.cuantos) return juntas;
    }
    // Una página incompleta significa que ya no hay más documentos.
    if (pagina.length < o.tamanoDePagina) break;
    despuesDe = pagina[pagina.length - 1];
  }
  return juntas;
}

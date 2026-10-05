// Borrado recursivo de un documento y de todo lo que cuelga de él.
// El SDK de cliente de Firestore NO puede listar subcolecciones, así que el árbol se declara aquí.

export type Arbol = { [coleccion: string]: Arbol };

/**
 * Colecciones que cuelgan de `mediq_users/{uid}`. DEBE coincidir con docs/11-modelo-de-datos-firestore.md:
 * al agregar una colección nueva hay que agregarla aquí (la prueba de eliminarSubarbol.test.ts avisa),
 * o sus datos sobrevivirían a la eliminación de la cuenta (RNF-07).
 */
export const ARBOL_DE_CUENTA = {
  consents: {},
  patients: {},
  places: {},
  doctors: {},
  visits: { instructions: {}, prescriptions: { attachments: {} } },
} satisfies Arbol;

export interface RecorridoDeDocumentos {
  /** Ids de los documentos de una colección (la ruta son sus segmentos). */
  listarIds(rutaColeccion: string[]): Promise<string[]>;
  borrar(rutasDocumento: string[][]): Promise<void>;
}

const TAMANO_DE_LOTE = 500; // límite de operaciones por lote de Firestore

async function borrarEnLotes(rutas: string[][], io: RecorridoDeDocumentos): Promise<void> {
  for (let i = 0; i < rutas.length; i += TAMANO_DE_LOTE) {
    await io.borrar(rutas.slice(i, i + TAMANO_DE_LOTE));
  }
}

async function vaciarColecciones(rutaDocumento: string[], arbol: Arbol, io: RecorridoDeDocumentos): Promise<void> {
  for (const [nombre, hijos] of Object.entries(arbol)) {
    const rutaColeccion = [...rutaDocumento, nombre];
    const ids = await io.listarIds(rutaColeccion);
    for (const id of ids) await vaciarColecciones([...rutaColeccion, id], hijos, io); // primero los hijos
    await borrarEnLotes(
      ids.map((id) => [...rutaColeccion, id]),
      io,
    );
  }
}

/** Borra las colecciones del árbol (hijos antes que padres) y, al final, el documento raíz. */
export async function eliminarSubarbol(raiz: string[], arbol: Arbol, io: RecorridoDeDocumentos): Promise<void> {
  await vaciarColecciones(raiz, arbol, io);
  await io.borrar([raiz]);
}

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
  medicationSchedules: {},
  doseLogs: {},
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

/**
 * Ids que se conocen de antemano y se RECORREN aunque su documento no exista (AUD-02, F063). Firestore solo lista documentos que existen:
 * si el documento padre no existe (`receta` sin receta guardada, o una consulta que solo se conoce por sus archivos), sus subcolecciones
 * no se alcanzarían y sus datos sobrevivirían a la baja de la cuenta. La clave es la cadena de colecciones desde la raíz
 * (`visits/prescriptions`). Estos ids solo se recorren: solo se borran los documentos que de verdad existen.
 */
export type IdsAdicionales = { [cadenaDeColecciones: string]: string[] };

/** Los ids fijos del modelo (docs/11): la receta de una consulta se llama siempre `receta` y su foto `foto`. */
export const ADICIONALES_DE_CUENTA: IdsAdicionales = {
  'visits/prescriptions': ['receta'],
  'visits/prescriptions/attachments': ['foto'],
};

async function vaciarColecciones(rutaDocumento: string[], arbol: Arbol, io: RecorridoDeDocumentos, adicionales: IdsAdicionales, cadena: string[]): Promise<void> {
  for (const [nombre, hijos] of Object.entries(arbol)) {
    const rutaColeccion = [...rutaDocumento, nombre];
    const cadenaAqui = [...cadena, nombre];
    const existentes = await io.listarIds(rutaColeccion);
    const aRecorrer = [...new Set([...existentes, ...(adicionales[cadenaAqui.join('/')] ?? [])])];
    for (const id of aRecorrer) await vaciarColecciones([...rutaColeccion, id], hijos, io, adicionales, cadenaAqui); // primero los hijos
    await borrarEnLotes(
      existentes.map((id) => [...rutaColeccion, id]),
      io,
    );
  }
}

/** Borra las colecciones del árbol (hijos antes que padres) y, al final, el documento raíz. */
export async function eliminarSubarbol(raiz: string[], arbol: Arbol, io: RecorridoDeDocumentos, adicionales: IdsAdicionales = {}): Promise<void> {
  await vaciarColecciones(raiz, arbol, io, adicionales, []);
  await io.borrar([raiz]);
}

import { collection, deleteDoc, doc, getDocs, writeBatch, type Firestore } from 'firebase/firestore';
import { deleteObject, listAll, ref, type FirebaseStorage, type StorageReference } from 'firebase/storage';

import type { EliminadorDeDatos } from '../domain/EliminadorDeDatos';
import { ARBOL_DE_CUENTA, eliminarSubarbol } from './eliminarSubarbol';

const COLECCION = 'mediq_users';

/** Borra `mediq_users/{uid}` con todas sus subcolecciones y, si hay Storage, todos sus archivos (fotos de recetas, RF-30). */
export class FirestoreEliminadorDeDatos implements EliminadorDeDatos {
  constructor(
    private readonly db: Firestore,
    private readonly storage?: FirebaseStorage,
  ) {}

  async eliminarTodo(usuarioId: string): Promise<void> {
    // Primero los archivos: si falla, los documentos siguen y la baja se puede reintentar sin dejar fotos huérfanas.
    if (this.storage) await this.borrarCarpeta(ref(this.storage, `${COLECCION}/${usuarioId}`));
    await eliminarSubarbol([COLECCION, usuarioId], ARBOL_DE_CUENTA, {
      listarIds: async (ruta) => {
        const [primero, ...resto] = ruta;
        const lote = await getDocs(collection(this.db, primero, ...resto));
        return lote.docs.map((d) => d.id);
      },
      borrar: async (rutas) => {
        if (rutas.length === 1) {
          const [primero, ...resto] = rutas[0];
          await deleteDoc(doc(this.db, primero, ...resto));
          return;
        }
        const lote = writeBatch(this.db);
        for (const [primero, ...resto] of rutas) lote.delete(doc(this.db, primero, ...resto));
        await lote.commit();
      },
    });
  }

  /** El SDK no borra carpetas: se listan los archivos y subcarpetas y se borra uno por uno. */
  private async borrarCarpeta(carpeta: StorageReference): Promise<void> {
    const { items, prefixes } = await listAll(carpeta);
    await Promise.all(items.map((i) => deleteObject(i)));
    for (const p of prefixes) await this.borrarCarpeta(p);
  }
}

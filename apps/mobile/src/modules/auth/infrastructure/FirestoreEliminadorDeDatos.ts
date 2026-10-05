import { collection, deleteDoc, doc, getDocs, writeBatch, type Firestore } from 'firebase/firestore';

import type { EliminadorDeDatos } from '../domain/EliminadorDeDatos';
import { ARBOL_DE_CUENTA, eliminarSubarbol } from './eliminarSubarbol';

const COLECCION = 'mediq_users';

/** Borra `mediq_users/{uid}` con todas sus subcolecciones. Los archivos de Storage se agregarán con las fotos (RF-30). */
export class FirestoreEliminadorDeDatos implements EliminadorDeDatos {
  constructor(private readonly db: Firestore) {}

  async eliminarTodo(usuarioId: string): Promise<void> {
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
}

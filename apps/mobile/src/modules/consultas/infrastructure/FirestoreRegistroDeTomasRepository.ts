import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where, type Firestore } from 'firebase/firestore';

import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import { aDocumentoDeToma } from './documentoDeToma';

const RAIZ = 'mediq_users';

export class FirestoreRegistroDeTomasRepository implements RegistroDeTomasRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async coleccion() {
    return collection(this.db, RAIZ, await this.usuarioId(), 'doseLogs');
  }

  /** El id del documento es el de la toma: registrar dos veces la misma dosis la reescribe en vez de duplicarla. */
  async registrar(toma: TomaRegistrada): Promise<void> {
    await setDoc(doc(await this.coleccion(), toma.tomaId), { ...aDocumentoDeToma(toma), createdAt: serverTimestamp() });
  }

  async tomadasDesde(fecha: Date): Promise<{ tomaId: string; tomadaEn: Date }[]> {
    const lote = await getDocs(query(await this.coleccion(), where('takenAt', '>=', fecha)));
    return lote.docs.flatMap((d) => {
      const tomadaEn = (d.data().takenAt as { toDate?: () => Date } | undefined)?.toDate?.();
      return tomadaEn ? [{ tomaId: d.id, tomadaEn }] : [];
    });
  }

  /** Borrar un documento que no existe no falla en Firestore. */
  async deshacer(tomaId: string): Promise<void> {
    await deleteDoc(doc(await this.coleccion(), tomaId));
  }
}

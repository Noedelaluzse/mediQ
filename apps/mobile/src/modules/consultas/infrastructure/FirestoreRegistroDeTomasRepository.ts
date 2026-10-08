import { collection, deleteDoc, doc, documentId, getDocs, query, serverTimestamp, setDoc, where, writeBatch, type Firestore } from 'firebase/firestore';

import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import { PREFIJO_DE_TOMAS } from '../domain/Toma';
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

  /**
   * Borra las dosis de un medicamento de una consulta: los documentos cuyo id empieza por `toma-{consulta}-{medicamento}-`. Es una consulta
   * por rango de id (no necesita índice) y se borra en lotes de 500, el límite de Firestore. Un medicamento sin dosis no hace nada.
   */
  async quitarDeMedicamento(consultaId: string, medicamentoId: string): Promise<void> {
    const prefijo = `${PREFIJO_DE_TOMAS}${consultaId}-${medicamentoId}-`;
    const encontradas = await getDocs(query(await this.coleccion(), where(documentId(), '>=', prefijo), where(documentId(), '<', `${prefijo}\uf8ff`)));
    for (let i = 0; i < encontradas.docs.length; i += 500) {
      const lote = writeBatch(this.db);
      for (const d of encontradas.docs.slice(i, i + 500)) lote.delete(d.ref);
      await lote.commit();
    }
  }

  /** Borrar un documento que no existe no falla en Firestore. */
  async deshacer(tomaId: string): Promise<void> {
    await deleteDoc(doc(await this.coleccion(), tomaId));
  }
}

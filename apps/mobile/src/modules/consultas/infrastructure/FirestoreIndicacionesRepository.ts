import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';
import { aDocumentoDeIndicacion, deDocumentoDeIndicacion, type DocumentoDeIndicacion } from './documentoDeIndicacion';

export class FirestoreIndicacionesRepository implements IndicacionesRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async coleccion(consultaId: string) {
    return collection(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId, 'instructions');
  }

  async listar(consultaId: string): Promise<Indicacion[]> {
    const lote = await getDocs(await this.coleccion(consultaId));
    return lote.docs
      .map((d) => deDocumentoDeIndicacion(d.id, d.data() as DocumentoDeIndicacion))
      .filter((i): i is Indicacion => i !== null);
  }

  async guardar(consultaId: string, i: Indicacion): Promise<void> {
    const ref = doc(await this.coleccion(consultaId), i.id);
    const existe = (await getDoc(ref)).exists();
    await setDoc(ref, { ...aDocumentoDeIndicacion(i), ...(existe ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() }, { merge: true });
  }

  async quitar(consultaId: string, indicacionId: string): Promise<void> {
    await deleteDoc(doc(await this.coleccion(consultaId), indicacionId));
  }
}

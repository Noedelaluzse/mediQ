import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import { aDocumentoDeReceta, deDocumentoDeReceta, type DocumentoDeReceta } from './documentoDeReceta';

const ID_DE_LA_RECETA = 'receta';

export class FirestoreRecetaRepository implements RecetaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async referencia(consultaId: string) {
    return doc(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId, 'prescriptions', ID_DE_LA_RECETA);
  }

  async obtener(consultaId: string): Promise<Medicamento[]> {
    const snap = await getDoc(await this.referencia(consultaId));
    return snap.exists() ? deDocumentoDeReceta(snap.data() as DocumentoDeReceta) : [];
  }

  async guardar(consultaId: string, medicamentos: Medicamento[]): Promise<void> {
    const ref = await this.referencia(consultaId);
    const existe = (await getDoc(ref)).exists();
    await setDoc(ref, { ...aDocumentoDeReceta(medicamentos), ...(existe ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() }, { merge: true });
  }

  async quitar(consultaId: string): Promise<void> {
    await deleteDoc(await this.referencia(consultaId));
  }
}

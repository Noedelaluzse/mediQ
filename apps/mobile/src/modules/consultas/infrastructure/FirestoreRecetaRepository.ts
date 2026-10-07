import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';

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

  /** La consulta dueña de la receta: ahí vive la marca `hasPrescription` (F048). */
  private async consulta(consultaId: string) {
    return doc(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId);
  }

  // La receta y la marca de su consulta se escriben en un solo lote: o quedan las dos o ninguna. No se toca `updatedAt` de la consulta.
  async guardar(consultaId: string, medicamentos: Medicamento[]): Promise<void> {
    const ref = await this.referencia(consultaId);
    const existe = (await getDoc(ref)).exists();
    const lote = writeBatch(this.db);
    lote.set(ref, { ...aDocumentoDeReceta(medicamentos), ...(existe ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() }, { merge: true });
    lote.update(await this.consulta(consultaId), { hasPrescription: true });
    await lote.commit();
  }

  async quitar(consultaId: string): Promise<void> {
    const lote = writeBatch(this.db);
    lote.delete(await this.referencia(consultaId));
    lote.update(await this.consulta(consultaId), { hasPrescription: false });
    await lote.commit();
  }
}

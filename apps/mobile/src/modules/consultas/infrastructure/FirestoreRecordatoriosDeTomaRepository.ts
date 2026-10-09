import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, where, writeBatch, type Firestore } from 'firebase/firestore';

import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RecordatorioDeToma } from '../domain/Toma';
import { aDocumentoDeRecordatorio, deDocumentoDeRecordatorio, idDeRecordatorio, type DocumentoDeRecordatorio } from './documentoDeRecordatorio';

const RAIZ = 'mediq_users';

export class FirestoreRecordatoriosDeTomaRepository implements RecordatoriosDeTomaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async coleccion() {
    return collection(this.db, RAIZ, await this.usuarioId(), 'medicationSchedules');
  }

  async listar(): Promise<RecordatorioDeToma[]> {
    const lote = await getDocs(await this.coleccion());
    return lote.docs.map((d) => deDocumentoDeRecordatorio(d.data() as DocumentoDeRecordatorio, d.id)).filter((r): r is RecordatorioDeToma => r !== null);
  }

  /** En un solo lote: se borran los recordatorios anteriores de la consulta y se escriben los nuevos (o todo o nada). */
  async reemplazarDe(consultaId: string, recordatorios: RecordatorioDeToma[]): Promise<void> {
    const coleccion = await this.coleccion();
    const lote = writeBatch(this.db);
    for (const anterior of (await getDocs(query(coleccion, where('visitId', '==', consultaId)))).docs) lote.delete(anterior.ref);
    for (const r of recordatorios) {
      lote.set(doc(coleccion, idDeRecordatorio(consultaId, r.medicamentoId)), { ...aDocumentoDeRecordatorio(r), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await lote.commit();
  }

  async quitarDe(consultaId: string): Promise<void> {
    const coleccion = await this.coleccion();
    for (const d of (await getDocs(query(coleccion, where('visitId', '==', consultaId)))).docs) await deleteDoc(d.ref);
  }
}

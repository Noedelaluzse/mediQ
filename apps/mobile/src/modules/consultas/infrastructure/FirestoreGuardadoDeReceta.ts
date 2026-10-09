import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, type Firestore } from 'firebase/firestore';

import type { GuardadoDeRecetaRepository } from '../domain/GuardadoDeRecetaRepository';
import type { Medicamento } from '../domain/Receta';
import type { RecordatorioDeToma } from '../domain/Toma';
import { aDocumentoDeReceta, deDocumentoDeReceta, type DocumentoDeReceta } from './documentoDeReceta';
import { aDocumentoDeRecordatorio, idDeRecordatorio } from './documentoDeRecordatorio';

const RAIZ = 'mediq_users';

/**
 * Receta + marca de la consulta + recordatorios de toma en UNA transacción de Firestore (AUD-03, F064): o se escribe todo o no se escribe
 * nada, incluso si las reglas rechazan una sola de las partes. La transacción además lee la receta que había, así que dos guardados
 * simultáneos se reintentan en vez de pisarse.
 *
 * El SDK no permite consultas dentro de una transacción: los recordatorios que existen de la consulta se buscan antes. Se borran los
 * que ya no corresponden (los de los medicamentos que había en la receta y cualquier otro suelto de esa consulta, que así se autocorrige).
 */
export class FirestoreGuardadoDeReceta implements GuardadoDeRecetaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async guardar(consultaId: string, medicamentos: Medicamento[], recordatorios: RecordatorioDeToma[]): Promise<void> {
    const usuario = await this.usuarioId();
    const receta = doc(this.db, RAIZ, usuario, 'visits', consultaId, 'prescriptions', 'receta');
    const consulta = doc(this.db, RAIZ, usuario, 'visits', consultaId);
    const coleccion = collection(this.db, RAIZ, usuario, 'medicationSchedules');
    const sueltos = (await getDocs(query(coleccion, where('visitId', '==', consultaId)))).docs.map((d) => d.id);

    await runTransaction(this.db, async (tx) => {
      // Todas las lecturas antes de escribir.
      const actual = await tx.get(receta);
      const deLaRecetaAnterior = actual.exists() ? deDocumentoDeReceta(actual.data() as DocumentoDeReceta).flatMap((m) => (m.id ? [idDeRecordatorio(consultaId, m.id)] : [])) : [];

      if (medicamentos.length === 0) tx.delete(receta);
      else tx.set(receta, { ...aDocumentoDeReceta(medicamentos), ...(actual.exists() ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() }, { merge: true });
      // La marca de la consulta va con la receta (F048); no se toca `updatedAt` de la consulta.
      tx.update(consulta, { hasPrescription: medicamentos.length > 0 });

      const nuevos = new Set(recordatorios.map((r) => idDeRecordatorio(consultaId, r.medicamentoId)));
      for (const id of new Set([...sueltos, ...deLaRecetaAnterior])) if (!nuevos.has(id)) tx.delete(doc(coleccion, id));
      for (const r of recordatorios) {
        tx.set(doc(coleccion, idDeRecordatorio(consultaId, r.medicamentoId)), { ...aDocumentoDeRecordatorio(r), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    });
  }
}

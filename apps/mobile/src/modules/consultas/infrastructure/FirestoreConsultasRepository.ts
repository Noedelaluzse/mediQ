import { collection, deleteField, doc, runTransaction, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { aCambiosDeDocumento } from './cambiosDeConsulta';
import { aDocumentoDeConsulta } from './documentoDeConsulta';
import { aDocumentoDeIndicacion } from './documentoDeIndicacion';
import { marcaAlGuardarConsulta } from './marcaDeReceta';

/**
 * Guarda cada consulta en `mediq_users/{uid}/visits/{id}` junto con sus indicaciones (`instructions/{id}`) en una
 * sola transacción: o se guarda todo o nada. Las reglas de Firestore son la segunda barrera de validación.
 *
 * Es transacción (y no un lote) para leer antes si la consulta ya existía: la cola de envío REescribe la misma consulta al reenviar,
 * y `hasPrescription` (F060) nace en `false` solo la primera vez; si ya había una marca, se conserva (ver `marcaDeReceta.ts`).
 * Cuesta una lectura por consulta nueva y solo se llama con internet (sin él, la consulta espera en la cola).
 */
export class FirestoreConsultasRepository implements ConsultaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async guardar(c: Consulta): Promise<void> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const visita = doc(visitas, c.id);
    await runTransaction(this.db, async (tx) => {
      const existente = await tx.get(visita);
      tx.set(visita, { ...aDocumentoDeConsulta(c), ...marcaAlGuardarConsulta(existente.exists() ? existente.data() : null), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      for (const i of c.indicaciones) {
        tx.set(doc(collection(visita, 'instructions'), i.id), { ...aDocumentoDeIndicacion(i), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    });
  }

  private async visita(consultaId: string) {
    return doc(collection(this.db, 'mediq_users', await this.usuarioId(), 'visits'), consultaId);
  }

  /** Cambia solo los campos editables; un opcional vaciado se borra del documento. No toca indicaciones ni `createdAt`. */
  async actualizar(c: Consulta): Promise<void> {
    const cambios = Object.fromEntries(Object.entries(aCambiosDeDocumento(c)).map(([campo, valor]) => [campo, valor === null ? deleteField() : valor]));
    await updateDoc(await this.visita(c.id), { ...cambios, updatedAt: serverTimestamp() });
  }

  async eliminar(consultaId: string): Promise<void> {
    await updateDoc(await this.visita(consultaId), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

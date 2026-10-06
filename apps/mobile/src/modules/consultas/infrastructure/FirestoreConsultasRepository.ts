import { collection, deleteField, doc, serverTimestamp, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { aCambiosDeDocumento } from './cambiosDeConsulta';
import { aDocumentoDeConsulta } from './documentoDeConsulta';
import { aDocumentoDeIndicacion } from './documentoDeIndicacion';

/**
 * Guarda cada consulta en `mediq_users/{uid}/visits/{id}` junto con sus indicaciones (`instructions/{id}`) en un
 * solo lote: o se guarda todo o nada. Las reglas de Firestore son la segunda barrera de validación.
 */
export class FirestoreConsultasRepository implements ConsultaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async guardar(c: Consulta): Promise<void> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const visita = doc(visitas, c.id);
    const lote = writeBatch(this.db);
    lote.set(visita, { ...aDocumentoDeConsulta(c), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    for (const i of c.indicaciones) {
      lote.set(doc(collection(visita, 'instructions'), i.id), { ...aDocumentoDeIndicacion(i), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await lote.commit();
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

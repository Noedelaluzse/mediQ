import { collection, doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
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
}

import { collection, doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { aDocumentoDeConsulta } from './documentoDeConsulta';

/** Guarda cada consulta en `mediq_users/{uid}/visits/{id}`. Las reglas de Firestore son la segunda barrera de validación. */
export class FirestoreConsultasRepository implements ConsultaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async guardar(c: Consulta): Promise<void> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    await setDoc(doc(visitas, c.id), { ...aDocumentoDeConsulta(c), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

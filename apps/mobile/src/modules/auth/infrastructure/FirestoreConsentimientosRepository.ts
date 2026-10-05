import { collection, doc, getDocs, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

import { idDeConsentimiento, type Consentimiento } from '../domain/Consentimiento';
import type { ConsentimientosRepository } from '../domain/ConsentimientosRepository';
import { aDocumentoConsentimiento, deDocumentoConsentimiento } from './documentoConsentimiento';

const COLECCION = 'mediq_users';

/** Guarda cada aceptación en `mediq_users/{uid}/consents/{documento}_{versión}`. */
export class FirestoreConsentimientosRepository implements ConsentimientosRepository {
  constructor(private readonly db: Firestore) {}

  async listar(usuarioId: string): Promise<Consentimiento[]> {
    const lote = await getDocs(collection(this.db, COLECCION, usuarioId, 'consents'));
    return lote.docs
      .map((d) => deDocumentoConsentimiento(d.data() as Parameters<typeof deDocumentoConsentimiento>[0]))
      .filter((c): c is Consentimiento => c !== null);
  }

  async registrar(usuarioId: string, c: Consentimiento): Promise<void> {
    await setDoc(doc(this.db, COLECCION, usuarioId, 'consents', idDeConsentimiento(c.documento, c.version)), {
      ...aDocumentoConsentimiento(c),
      acceptedAt: serverTimestamp(),
    });
  }
}

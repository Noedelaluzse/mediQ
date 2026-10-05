import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';

import { ID_PERFIL_PROPIO, type Cuenta } from '../domain/Cuenta';
import type { CuentasRepository } from '../domain/CuentasRepository';
import {
  aDocumentoPerfil,
  aDocumentoUsuario,
  deDocumentos,
  type DocumentoPerfil,
  type DocumentoUsuario,
} from './documentosCuenta';

const COLECCION = 'mediq_users';

/** Guarda la cuenta en `mediq_users/{uid}` y el perfil propio en `mediq_users/{uid}/patients/self`. */
export class FirestoreCuentasRepository implements CuentasRepository {
  constructor(private readonly db: Firestore) {}

  async buscar(usuarioId: string): Promise<Cuenta | null> {
    const usuario = await getDoc(doc(this.db, COLECCION, usuarioId));
    if (!usuario.exists()) return null;
    const perfil = await getDoc(doc(this.db, COLECCION, usuarioId, 'patients', ID_PERFIL_PROPIO));
    if (!perfil.exists()) return null;
    return deDocumentos(
      usuarioId,
      usuario.data() as DocumentoUsuario,
      ID_PERFIL_PROPIO,
      perfil.data() as DocumentoPerfil,
    );
  }

  async crear(cuenta: Cuenta): Promise<void> {
    const lote = writeBatch(this.db);
    lote.set(doc(this.db, COLECCION, cuenta.usuarioId), { ...aDocumentoUsuario(cuenta), createdAt: serverTimestamp() });
    lote.set(doc(this.db, COLECCION, cuenta.usuarioId, 'patients', cuenta.perfilPropio.id), {
      ...aDocumentoPerfil(cuenta.perfilPropio),
      createdAt: serverTimestamp(),
    });
    await lote.commit();
  }
}

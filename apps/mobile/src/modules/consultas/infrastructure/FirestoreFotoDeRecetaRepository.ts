import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

import { bytesABase64 } from '@/shared/kernel/base64';

import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';
import { aDocumentoDeFoto, deDocumentoDeFoto, rutaDeFotoDeReceta, type DocumentoDeFoto } from './documentoDeFoto';

/** Archivo en Storage (`rutaDeFotoDeReceta`) + datos en `visits/{id}/prescriptions/receta/attachments/foto`. */
export class FirestoreFotoDeRecetaRepository implements FotoDeRecetaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly storage: FirebaseStorage,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async referenciaDelDocumento(consultaId: string) {
    return doc(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId, 'prescriptions', 'receta', 'attachments', 'foto');
  }

  async obtener(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null> {
    const snap = await getDoc(await this.referenciaDelDocumento(consultaId));
    if (!snap.exists()) return null;
    const data = snap.data() as DocumentoDeFoto;
    const foto = deDocumentoDeFoto(data);
    if (!foto || !data.storagePath) return null;
    // Se bajan los bytes con la sesión (las reglas de Storage mandan); no se usa una URL pública con token.
    // La ruta se calcula (F038), no se lee de `storagePath`: un documento manipulado no puede apuntar a otro archivo.
    const bytes = await getBytes(ref(this.storage, rutaDeFotoDeReceta(await this.usuarioId(), consultaId)));
    return { foto, uri: `data:${foto.tipoMime};base64,${bytesABase64(new Uint8Array(bytes))}` };
  }

  async guardar(consultaId: string, foto: FotoDeReceta, base64: string): Promise<void> {
    const ruta = rutaDeFotoDeReceta(await this.usuarioId(), consultaId);
    // Primero el archivo: si falla la subida no queda un documento apuntando a la nada.
    // React Native no puede crear un Blob desde bytes (`uploadString` falla con «Creating blobs from 'ArrayBuffer'…»):
    // se arma el Blob con fetch sobre una URI `data:`, que sí soporta.
    const blob = await (await fetch(`data:${foto.tipoMime};base64,${base64}`)).blob();
    await uploadBytes(ref(this.storage, ruta), blob, { contentType: foto.tipoMime });
    const documento = await this.referenciaDelDocumento(consultaId);
    const existe = (await getDoc(documento)).exists();
    await setDoc(documento, { ...aDocumentoDeFoto(foto, ruta), ...(existe ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
  }

  async quitar(consultaId: string): Promise<void> {
    await deleteDoc(await this.referenciaDelDocumento(consultaId));
    try {
      await deleteObject(ref(this.storage, rutaDeFotoDeReceta(await this.usuarioId(), consultaId)));
    } catch (e) {
      if ((e as { code?: string }).code !== 'storage/object-not-found') throw e;
    }
  }
}

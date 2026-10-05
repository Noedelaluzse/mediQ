import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { aDocumentoMedico, deDocumentoMedico, type DocumentoMedico } from './documentosMedicos';

const RAIZ = 'mediq_users';

/** Guarda cada médico en `mediq_users/{uid}/doctors/{id}`; "eliminar" solo marca `deletedAt`. */
export class FirestoreMedicosRepository implements MedicosRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async coleccion() {
    return collection(this.db, RAIZ, await this.usuarioId(), 'doctors');
  }

  async listar(): Promise<Medico[]> {
    const lote = await getDocs(query(await this.coleccion(), where('deletedAt', '==', null)));
    return lote.docs
      .map((d) => deDocumentoMedico(d.id, d.data() as DocumentoMedico))
      .filter((m): m is Medico => m !== null);
  }

  async obtener(id: string): Promise<Medico | null> {
    const d = await getDoc(doc(await this.coleccion(), id));
    const datos = d.data() as DocumentoMedico | undefined;
    return d.exists() && !datos?.deletedAt ? deDocumentoMedico(d.id, datos ?? {}) : null;
  }

  async guardar(m: Medico): Promise<void> {
    const ref = doc(await this.coleccion(), m.id);
    const existe = (await getDoc(ref)).exists();
    // merge:false reemplaza los campos opcionales que el usuario borró; se conservan las fechas de creación.
    await setDoc(
      ref,
      { ...aDocumentoMedico(m), ...(existe ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() },
      { merge: false },
    );
  }

  async contarConsultas(id: string): Promise<number> {
    const usuario = await this.usuarioId();
    const lote = await getDocs(query(collection(this.db, RAIZ, usuario, 'visits'), where('doctorId', '==', id)));
    return lote.docs.filter((d) => !d.data().deletedAt).length;
  }

  async eliminar(id: string): Promise<void> {
    await updateDoc(doc(await this.coleccion(), id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

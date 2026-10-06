import { doc, getDoc, updateDoc, type Firestore } from 'firebase/firestore';

import { ID_PERFIL_PROPIO } from '../domain/Cuenta';
import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';
import { aCambiosDeSalud, deDocumentoDeSalud, type DocumentoDeSalud } from './documentoDeSalud';

const RAIZ = 'mediq_users';

/** Lee y actualiza los campos de salud del perfil propio (`patients/self`); el perfil lo crea el registro de la cuenta. */
export class FirestoreDatosDeSaludRepository implements DatosDeSaludRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async perfil() {
    return doc(this.db, RAIZ, await this.usuarioId(), 'patients', ID_PERFIL_PROPIO);
  }

  async obtener(): Promise<DatosDeSalud> {
    const d = await getDoc(await this.perfil());
    return d.exists() ? deDocumentoDeSalud(d.data() as DocumentoDeSalud) : SIN_DATOS;
  }

  async guardar(datos: DatosDeSalud): Promise<void> {
    await updateDoc(await this.perfil(), aCambiosDeSalud(datos));
  }
}

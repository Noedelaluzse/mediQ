import { doc, getDoc, type Firestore } from 'firebase/firestore';

import type { Consulta } from '../domain/Consulta';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { deDocumentoDeConsultaCompleta, type DocumentoDeConsultaCompleta } from './documentoDeConsultaCompleta';

export class FirestoreDetalleDeConsultaRepository implements DetalleDeConsultaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async obtener(consultaId: string): Promise<Consulta | null> {
    const d = await getDoc(doc(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId));
    return d.exists() ? deDocumentoDeConsultaCompleta(d.id, d.data() as DocumentoDeConsultaCompleta) : null;
  }
}

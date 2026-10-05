import { collection, getDocs, limit, orderBy, query, startAfter, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';
import { deDocumentoDelDiario, type DocumentoDelDiario } from './documentoDelDiario';

const TAMANO_DE_PAGINA = 20;

/**
 * Lee `mediq_users/{uid}/visits` por `visitedAt` descendente (índice simple automático). Las consultas borradas
 * (`deletedAt`) se descartan en el cliente: así no hace falta un índice compuesto, y se piden más documentos
 * hasta juntar una página completa.
 */
export class FirestoreDiarioRepository implements DiarioRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async pagina(cursor?: CursorDelDiario): Promise<PaginaDelDiario> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const juntas: { documento: QueryDocumentSnapshot; consulta: ConsultaDelDiario }[] = [];
    let desde = cursor as unknown as QueryDocumentSnapshot | undefined;
    let agotado = false;

    while (juntas.length < TAMANO_DE_PAGINA && !agotado) {
      const lote = await getDocs(
        desde
          ? query(visitas, orderBy('visitedAt', 'desc'), startAfter(desde), limit(TAMANO_DE_PAGINA))
          : query(visitas, orderBy('visitedAt', 'desc'), limit(TAMANO_DE_PAGINA)),
      );
      for (const documento of lote.docs) {
        const consulta = deDocumentoDelDiario(documento.id, documento.data() as DocumentoDelDiario);
        if (consulta) juntas.push({ documento, consulta });
      }
      agotado = lote.docs.length < TAMANO_DE_PAGINA;
      desde = lote.docs[lote.docs.length - 1];
    }

    const pagina = juntas.slice(0, TAMANO_DE_PAGINA);
    const hayMas = juntas.length > TAMANO_DE_PAGINA || !agotado;
    return {
      consultas: pagina.map((p) => p.consulta),
      siguiente: hayMas && pagina.length > 0 ? (pagina[pagina.length - 1].documento as unknown as CursorDelDiario) : undefined,
    };
  }
}

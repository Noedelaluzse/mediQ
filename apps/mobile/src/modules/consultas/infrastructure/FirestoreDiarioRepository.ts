import { collection, getDocs, limit, orderBy, query, startAfter, where, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';
import { deDocumentoDelDiario, type DocumentoDelDiario } from './documentoDelDiario';
import { RespaldoPorIndice } from './respaldoPorIndice';

const TAMANO_DE_PAGINA = 20;

/**
 * Lee `mediq_users/{uid}/visits` por `visitedAt` descendente. Con el índice compuesto desplegado (`firebase/firestore.indexes.json`) el servidor
 * entrega solo las no borradas (`deletedAt == null`, F077). Sin él (aún no creado o construyéndose) se usa el método anterior: las borradas
 * se descartan aquí y se piden más documentos hasta juntar una página completa. El cursor sirve en los dos casos.
 */
export class FirestoreDiarioRepository implements DiarioRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  /** Con el índice desplegado el servidor entrega solo las vigentes; sin él (aún no creado o construyéndose) se usa el método anterior y no hay error (F077). */
  private readonly respaldo = new RespaldoPorIndice();

  pagina(cursor?: CursorDelDiario): Promise<PaginaDelDiario> {
    return this.respaldo.ejecutar(
      () => this.leerPagina(cursor, true),
      () => this.leerPagina(cursor, false),
    );
  }

  private async leerPagina(cursor: CursorDelDiario | undefined, filtrarEnElServidor: boolean): Promise<PaginaDelDiario> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const juntas: { documento: QueryDocumentSnapshot; consulta: ConsultaDelDiario }[] = [];
    let desde = cursor as unknown as QueryDocumentSnapshot | undefined;
    let agotado = false;
    const vigentes = filtrarEnElServidor ? [where('deletedAt', '==', null)] : [];

    while (juntas.length < TAMANO_DE_PAGINA && !agotado) {
      const lote = await getDocs(
        desde
          ? query(visitas, ...vigentes, orderBy('visitedAt', 'desc'), startAfter(desde), limit(TAMANO_DE_PAGINA))
          : query(visitas, ...vigentes, orderBy('visitedAt', 'desc'), limit(TAMANO_DE_PAGINA)),
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

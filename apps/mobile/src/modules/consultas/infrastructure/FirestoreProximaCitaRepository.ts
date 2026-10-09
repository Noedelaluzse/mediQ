import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';

import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import { deDocumentoDeProximaCita, type DocumentoDeProximaCita } from './documentoDeProximaCita';
import { reunirVigentes } from './reunirVigentes';
import { RespaldoPorIndice } from './respaldoPorIndice';

/** Cuántas citas vigentes se devuelven (la tarjeta usa la primera; los avisos de citas, todas) y de cuántos documentos es cada petición. */
const CUANTAS = 10;

/**
 * Consulta `mediq_users/{uid}/visits` por `nextAppointmentAt` > ahora, ascendente (filtro y orden sobre el mismo campo:
 * índice simple automático) y, con el índice compuesto desplegado (`firebase/firestore.indexes.json`), solo las que no están borradas
 * (`deletedAt == null`, F077). Sin ese índice se usa el método anterior: se descartan las borradas aquí y, si hacen falta más para juntar
 * `CUANTAS` vigentes, se piden más páginas (`reunirVigentes`, AUD-12/F067).
 */
export class FirestoreProximaCitaRepository implements ProximaCitaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  /** Con el índice desplegado el servidor entrega solo las vigentes; sin él (aún no creado o construyéndose) se usa el método anterior y no hay error (F077). */
  private readonly respaldo = new RespaldoPorIndice();

  posterioresA(ahora: Date): Promise<ProximaCita[]> {
    return this.respaldo.ejecutar(
      () => this.leer(ahora, true),
      () => this.leer(ahora, false),
    );
  }

  private async leer(ahora: Date, filtrarEnElServidor: boolean): Promise<ProximaCita[]> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const condiciones = [...(filtrarEnElServidor ? [where('deletedAt', '==', null)] : []), where('nextAppointmentAt', '>', Timestamp.fromDate(ahora)), orderBy('nextAppointmentAt', 'asc')];
    return reunirVigentes<QueryDocumentSnapshot, ProximaCita>({
      tamanoDePagina: CUANTAS,
      cuantos: CUANTAS,
      pedir: async (despuesDe) => (await getDocs(query(visitas, ...condiciones, ...(despuesDe ? [startAfter(despuesDe)] : []), limit(CUANTAS)))).docs,
      // Aunque el servidor ya filtró, se vuelve a comprobar: es lo que hace correcto el método de respaldo.
      convertir: (d) => deDocumentoDeProximaCita(d.id, d.data() as DocumentoDeProximaCita),
    });
  }
}

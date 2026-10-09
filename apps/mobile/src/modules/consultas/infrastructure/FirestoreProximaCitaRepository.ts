import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore';

import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import { deDocumentoDeProximaCita, type DocumentoDeProximaCita } from './documentoDeProximaCita';
import { reunirVigentes } from './reunirVigentes';

/** Cuántas citas vigentes se devuelven (la tarjeta usa la primera; los avisos de citas, todas) y de cuántos documentos es cada petición. */
const CUANTAS = 10;

/**
 * Consulta `mediq_users/{uid}/visits` por `nextAppointmentAt` > ahora, ascendente (filtro y orden sobre el mismo campo:
 * índice simple automático). Las borradas se descartan en el cliente y, si hacen falta más para juntar `CUANTAS` vigentes, se piden más páginas
 * (`reunirVigentes`, AUD-12): antes se leían solo 10 documentos y 10 borradas con citas tempranas ocultaban la cita vigente que seguía.
 * No se usa un filtro `deletedAt == null` en Firestore porque exigiría un índice compuesto que hay que desplegar; el recorrido solo toca
 * consultas con cita futura, que son pocas.
 */
export class FirestoreProximaCitaRepository implements ProximaCitaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async posterioresA(ahora: Date): Promise<ProximaCita[]> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const desde = where('nextAppointmentAt', '>', Timestamp.fromDate(ahora));
    return reunirVigentes<QueryDocumentSnapshot, ProximaCita>({
      tamanoDePagina: CUANTAS,
      cuantos: CUANTAS,
      pedir: async (despuesDe) =>
        (await getDocs(despuesDe ? query(visitas, desde, orderBy('nextAppointmentAt', 'asc'), startAfter(despuesDe), limit(CUANTAS)) : query(visitas, desde, orderBy('nextAppointmentAt', 'asc'), limit(CUANTAS)))).docs,
      convertir: (d) => deDocumentoDeProximaCita(d.id, d.data() as DocumentoDeProximaCita),
    });
  }
}

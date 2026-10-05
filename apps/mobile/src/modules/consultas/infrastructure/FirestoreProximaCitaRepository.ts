import { collection, getDocs, limit, orderBy, query, Timestamp, where, type Firestore } from 'firebase/firestore';

import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import { deDocumentoDeProximaCita, type DocumentoDeProximaCita } from './documentoDeProximaCita';

/** Cuántas se piden: de sobra para saltarse las borradas, sin leer todo el historial. */
const CUANTAS = 10;

/**
 * Consulta `mediq_users/{uid}/visits` por `nextAppointmentAt` > ahora, ascendente (filtro y orden sobre el mismo campo:
 * índice simple automático). Las borradas se descartan en el cliente.
 */
export class FirestoreProximaCitaRepository implements ProximaCitaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  async posterioresA(ahora: Date): Promise<ProximaCita[]> {
    const visitas = collection(this.db, 'mediq_users', await this.usuarioId(), 'visits');
    const lote = await getDocs(query(visitas, where('nextAppointmentAt', '>', Timestamp.fromDate(ahora)), orderBy('nextAppointmentAt', 'asc'), limit(CUANTAS)));
    return lote.docs.map((d) => deDocumentoDeProximaCita(d.id, d.data() as DocumentoDeProximaCita)).filter((c): c is ProximaCita => c !== null);
  }
}

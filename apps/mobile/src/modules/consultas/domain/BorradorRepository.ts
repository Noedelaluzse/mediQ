import type { BorradorDeConsulta } from './Borrador';

/** Hay un solo borrador por usuario; vive en el dispositivo, nunca en Firestore. */
export interface BorradorRepository {
  leer(): Promise<BorradorDeConsulta | null>;
  guardar(borrador: BorradorDeConsulta): Promise<void>;
  borrar(): Promise<void>;
}

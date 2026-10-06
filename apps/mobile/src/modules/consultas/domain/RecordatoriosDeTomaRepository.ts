import type { RecordatorioDeToma } from './Toma';

/** Recordatorios de toma del usuario: `mediq_users/{uid}/medicationSchedules/{consultaId}_{indice}` (docs/11). */
export interface RecordatoriosDeTomaRepository {
  /** Todos los recordatorios del usuario (la app filtra los ya terminados). */
  listar(): Promise<RecordatorioDeToma[]>;
  /** Deja exactamente estos recordatorios para la consulta: borra los anteriores y escribe los nuevos. */
  reemplazarDe(consultaId: string, recordatorios: RecordatorioDeToma[]): Promise<void>;
  quitarDe(consultaId: string): Promise<void>;
}

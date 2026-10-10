import type { RecordatorioDeToma } from './Toma';

/** Recordatorios de toma del usuario: `mediq_users/{uid}/medicationSchedules/{consultaId}_{idDelMedicamento}` (docs/11). */
export interface RecordatoriosDeTomaRepository {
  /** Todos los recordatorios del usuario, también los de tratamientos ya terminados. */
  listar(): Promise<RecordatorioDeToma[]>;
  /**
   * Solo los recordatorios cuyo tratamiento termina DESPUÉS de `desde` (F070, AUD-10): los terminados no se descargan. La tarjeta «Hoy» y los
   * avisos de toma piden desde el inicio de hoy (un tratamiento que terminó hoy a las 14:00 sigue contando para las dosis de esta mañana).
   */
  listarActivos(desde: Date): Promise<RecordatorioDeToma[]>;
  /** Deja exactamente estos recordatorios para la consulta: borra los anteriores y escribe los nuevos. */
  reemplazarDe(consultaId: string, recordatorios: RecordatorioDeToma[]): Promise<void>;
  quitarDe(consultaId: string): Promise<void>;
}

/** Una dosis que el usuario marcó como tomada. */
export interface TomaRegistrada {
  /** Id del aviso de la toma: es también el id del documento, así registrar dos veces la misma dosis no duplica. */
  tomaId: string;
  consultaId: string;
  indice: number;
  medicamento: string;
  dosis?: string;
  programadaPara: Date;
  tomadaEn: Date;
}

/** Registro de tomas del usuario: `mediq_users/{uid}/doseLogs/{tomaId}` (docs/11). */
export interface RegistroDeTomasRepository {
  /** Guarda la dosis como tomada (idempotente). */
  registrar(toma: TomaRegistrada): Promise<void>;
  /** Las dosis tomadas desde la fecha, con su hora real: sirven para no volver a avisar de ellas y para la tarjeta «Hoy». */
  tomadasDesde(fecha: Date): Promise<{ tomaId: string; tomadaEn: Date }[]>;
  /** Quita el registro de una dosis (se marcó por error); si no existía, no pasa nada. */
  deshacer(tomaId: string): Promise<void>;
  /** Borra todas las dosis marcadas de un medicamento de una consulta: se llama cuando el medicamento deja de estar en la receta (AUD-01). */
  quitarDeMedicamento(consultaId: string, medicamentoId: string): Promise<void>;
}

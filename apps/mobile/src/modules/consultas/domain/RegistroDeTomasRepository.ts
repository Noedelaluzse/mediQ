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
  /** Ids de las dosis tomadas desde la fecha: sirven para no volver a avisar de ellas al reprogramar. */
  tomadasDesde(fecha: Date): Promise<string[]>;
}

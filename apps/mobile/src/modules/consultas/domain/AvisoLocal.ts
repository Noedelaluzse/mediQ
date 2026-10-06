/** Qué dosis es un aviso de toma: sirve para registrarla («Ya la tomé») o posponerla. */
export interface DatosDeToma {
  /** Id del aviso de la toma (`toma-{consulta}-{indice}-{marca}`): identifica la dosis y nombra su insistencia. */
  tomaId: string;
  indice: number;
  programadaPara: Date;
  medicamento: string;
  dosis?: string;
}

/** Una notificación local programada en el teléfono (cita o toma de un medicamento). */
export interface AvisoLocal {
  id: string;
  consultaId: string;
  cuando: Date;
  titulo: string;
  cuerpo: string;
  /** Categoría del sistema con botones («toma»); sin ella el aviso no lleva botones. */
  categoria?: string;
  /** Solo en los avisos de toma. */
  toma?: DatosDeToma;
}

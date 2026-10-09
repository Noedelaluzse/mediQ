export interface ConsultaDeMedico {
  id: string;
  fecha: Date;
  lugar?: string;
  motivo?: string;
}

/** Lo que el directorio de médicos necesita de sus consultas. */
export type ResumenBasicoDeConsultas = Omit<ResumenDeConsultas, 'lugares'>;

export interface ResumenDeConsultas {
  consultas: number;
  ultimaVisita?: Date;
  /** Lugares donde lo atendió, del más frecuente al menos. */
  lugares: string[];
}

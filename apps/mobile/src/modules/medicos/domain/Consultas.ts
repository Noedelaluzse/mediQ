export interface ConsultaDeMedico {
  id: string;
  fecha: Date;
  lugar?: string;
  motivo?: string;
}

export interface ResumenDeConsultas {
  consultas: number;
  ultimaVisita?: Date;
  /** Lugares donde lo atendió, del más frecuente al menos. */
  lugares: string[];
}

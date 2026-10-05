export interface ConsultaDeMedico {
  id: string;
  fecha: Date;
  lugar?: string;
  motivo?: string;
}

export interface ResumenDeConsultas {
  consultas: number;
  ultimaVisita?: Date;
}

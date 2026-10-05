import type { Consulta } from './Consulta';

export interface DetalleDeConsultaRepository {
  /** La consulta vigente (sin sus indicaciones), o null si no existe o está borrada. */
  obtener(consultaId: string): Promise<Consulta | null>;
}

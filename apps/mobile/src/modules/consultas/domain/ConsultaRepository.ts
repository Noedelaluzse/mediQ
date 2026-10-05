import type { Consulta } from './Consulta';

export interface ConsultaRepository {
  guardar(consulta: Consulta): Promise<void>;
}

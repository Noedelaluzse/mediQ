import type { Medico } from './Medico';

export interface MedicosRepository {
  listar(): Promise<Medico[]>;
  obtener(id: string): Promise<Medico | null>;
  guardar(medico: Medico): Promise<void>;
  contarConsultas(id: string): Promise<number>;
  eliminar(id: string): Promise<void>;
}

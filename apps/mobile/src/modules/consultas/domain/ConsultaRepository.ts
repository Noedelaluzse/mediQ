import type { Consulta } from './Consulta';

export interface ConsultaRepository {
  /** Crea la consulta junto con sus indicaciones. */
  guardar(consulta: Consulta): Promise<void>;
  /** Cambia los datos de una consulta existente; no toca sus indicaciones ni su fecha de creación. */
  actualizar(consulta: Consulta): Promise<void>;
  /** Borrado lógico: la consulta deja de verse en todas partes pero el documento se conserva. */
  eliminar(consultaId: string): Promise<void>;
}

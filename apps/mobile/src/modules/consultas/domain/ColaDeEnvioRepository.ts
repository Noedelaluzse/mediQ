import type { ConsultaPendiente } from './ConsultaPendiente';

/** Cola local (en el teléfono, por usuario) de consultas por enviar. */
export interface ColaDeEnvioRepository {
  agregar(consulta: ConsultaPendiente): Promise<void>;
  /** En el orden en que se capturaron. */
  listar(): Promise<ConsultaPendiente[]>;
  actualizar(consulta: ConsultaPendiente): Promise<void>;
  quitar(id: string): Promise<void>;
  /** Borra toda la cola de este usuario (al cerrar sesión o eliminar la cuenta: no debe quedar nada de salud en el teléfono). */
  vaciar(): Promise<void>;
}

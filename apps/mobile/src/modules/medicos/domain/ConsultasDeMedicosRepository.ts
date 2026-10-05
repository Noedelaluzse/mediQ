import type { ConsultaDeMedico, ResumenDeConsultas } from './Consultas';

/** Lectura de las consultas (visits) desde el módulo de médicos; escribirlas es de otro módulo. */
export interface ConsultasDeMedicosRepository {
  /** Número de consultas vigentes y última visita, por id de médico. */
  resumenPorMedico(): Promise<Map<string, ResumenDeConsultas>>;
  /** Consultas vigentes de un médico, de la más reciente a la más antigua. */
  deMedico(medicoId: string): Promise<ConsultaDeMedico[]>;
  contarTodas(): Promise<number>;
}

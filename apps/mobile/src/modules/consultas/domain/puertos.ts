import type { DomainError } from '@/shared/kernel/DomainError';
import type { Result } from '@/shared/kernel/Result';

export interface ReferenciaGuardada {
  id: string;
  nombre: string;
}

/** Garantiza que el médico de la consulta exista en el directorio (módulo de médicos). */
export interface MedicosParaConsulta {
  asegurar(datos: {
    /** Si viene, es un médico ya guardado que el paciente eligió. */
    medicoId?: string;
    nombre: string;
    especialidad: string;
    telefono?: string;
    cedula?: string;
  }): Promise<Result<ReferenciaGuardada, DomainError>>;
}

/** Garantiza que el lugar de la consulta exista en "Mis lugares" (módulo de médicos). */
export interface LugaresParaConsulta {
  asegurar(nombre: string): Promise<Result<ReferenciaGuardada, DomainError>>;
}

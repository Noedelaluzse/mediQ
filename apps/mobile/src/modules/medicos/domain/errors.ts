import { DomainError } from '@/shared/kernel/DomainError';

export class NombreDeMedicoRequeridoError extends DomainError {
  constructor() {
    super('El nombre del médico es obligatorio');
  }
}
export class EspecialidadInvalidaError extends DomainError {
  constructor(especialidad: string) {
    super(`Especialidad desconocida: ${especialidad}`);
  }
}
export class MedicoNoEncontradoError extends DomainError {
  constructor() {
    super('No se encontró el médico');
  }
}
export class MedicoConConsultasError extends DomainError {
  constructor(readonly consultas: number) {
    super(`El médico tiene ${consultas} consulta(s) registrada(s) y no se puede eliminar`);
  }
}
export class NombreDeLugarInvalidoError extends DomainError {
  constructor() {
    super('El nombre del lugar es obligatorio (máximo 80 caracteres)');
  }
}
export class LugarDuplicadoError extends DomainError {
  constructor() {
    super('Ya existe un lugar con ese nombre');
  }
}
export class LugarNoEncontradoError extends DomainError {
  constructor() {
    super('No se encontró el lugar');
  }
}

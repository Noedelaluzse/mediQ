import { DomainError } from '@/shared/kernel/DomainError';

export class FechaFuturaError extends DomainError {
  constructor() {
    super('La fecha de la consulta no puede ser futura');
  }
}
export class ProximaCitaInvalidaError extends DomainError {
  constructor() {
    super('La próxima cita debe ser posterior a la consulta');
  }
}
export class EspecialidadDeConsultaInvalidaError extends DomainError {
  constructor(especialidad: string) {
    super(`Especialidad desconocida: ${especialidad}`);
  }
}
export class LugarInvalidoError extends DomainError {
  constructor() {
    super('El nombre del lugar debe tener hasta 80 caracteres');
  }
}
export class DatosDeMedicoIncompletosError extends DomainError {
  constructor() {
    super('Hay teléfono o cédula del médico pero falta su nombre');
  }
}
export class IndicacionInvalidaError extends DomainError {
  constructor() {
    super('La indicación no puede estar vacía ni pasar de 300 caracteres');
  }
}
export class DemasiadasIndicacionesError extends DomainError {
  constructor() {
    super('Una consulta admite hasta 30 indicaciones');
  }
}
export class IndicacionNoEncontradaError extends DomainError {
  constructor() {
    super('No se encontró la indicación');
  }
}
export class ConsultaNoEncontradaError extends DomainError {
  constructor() {
    super('No se encontró la consulta');
  }
}
export class MedicamentoInvalidoError extends DomainError {
  constructor() {
    super('Cada medicamento necesita nombre (hasta 80 caracteres); dosis, frecuencia, duración y vía, hasta 60; indicaciones, hasta 300');
  }
}
export class DemasiadosMedicamentosError extends DomainError {
  constructor() {
    super('Una receta admite hasta 20 medicamentos');
  }
}
export class FotoInvalidaError extends DomainError {
  constructor() {
    super('La foto debe ser una imagen JPEG de hasta 5 MB');
  }
}
export class RecordatorioInvalidoError extends DomainError {
  constructor() {
    super('Para el recordatorio elige la hora de la primera toma, y una frecuencia y una duración de la lista');
  }
}

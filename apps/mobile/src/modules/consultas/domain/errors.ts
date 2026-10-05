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
export class TipoDeMedicoInvalidoError extends DomainError {
  constructor(tipo: string) {
    super(`Tipo de médico desconocido: ${tipo}`);
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

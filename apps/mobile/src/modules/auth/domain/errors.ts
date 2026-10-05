import { DomainError } from '@/shared/kernel/DomainError';

export class SesionInvalidaError extends DomainError {}
export class LoginCanceladoError extends DomainError {
  constructor() {
    super('El usuario canceló el inicio de sesión');
  }
}
export class ServidorNoDisponibleError extends DomainError {
  /** `causa`: el error original, para poder diagnosticar qué falló en el servidor. */
  constructor(causa?: unknown) {
    super('No se pudo contactar al servidor', { cause: causa });
  }
}
export class CredencialRechazadaError extends DomainError {
  constructor() {
    super('La cuenta de Google no fue aceptada');
  }
}
export class ProveedorNoDisponibleError extends DomainError {
  constructor() {
    super('El inicio de sesión con Google no está disponible');
  }
}
export class SesionNoRestauradaError extends DomainError {
  constructor() {
    super('No se pudo restaurar la sesión; hay que iniciar sesión de nuevo');
  }
}
export class ReautenticacionRequeridaError extends DomainError {
  constructor() {
    super('Firebase pide un inicio de sesión reciente para esta operación');
  }
}

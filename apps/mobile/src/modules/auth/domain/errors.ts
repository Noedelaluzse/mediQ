import { DomainError } from '@/shared/kernel/DomainError';

export class SesionInvalidaError extends DomainError {}
export class LoginCanceladoError extends DomainError {
  constructor() {
    super('El usuario canceló el inicio de sesión');
  }
}
export class ServidorNoDisponibleError extends DomainError {
  constructor() {
    super('No se pudo contactar al servidor');
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

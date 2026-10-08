import { esErrorDeRed } from '@/shared/kernel/red';

import { CredencialRechazadaError, SinConexionError } from '../domain/errors';

/** Firebase Auth exige un inicio de sesión reciente para operaciones sensibles, como borrar al usuario. */
export function esReautenticacionRequerida(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'auth/requires-recent-login';
}

/**
 * Por qué falló entrar a Firebase con el token de Google. Un fallo de red NO es una credencial rechazada: la cuenta puede ser
 * perfectamente válida y solo no hay internet (F052). Todo lo demás sí se trata como credencial rechazada.
 */
export function errorAlEntrarConGoogle(error: unknown): SinConexionError | CredencialRechazadaError {
  return esErrorDeRed(error) ? new SinConexionError(error) : new CredencialRechazadaError();
}

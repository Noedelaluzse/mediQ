import type { Result } from '@/shared/kernel/Result';

import type { CredencialRechazadaError, ServidorNoDisponibleError } from './errors';
import type { Sesion } from './Sesion';

/** Puerto: intercambia el idToken por una sesión propia (POST /auth/google). */
export interface AuthRepository {
  autenticarConGoogle(
    idToken: string,
  ): Promise<Result<Sesion, ServidorNoDisponibleError | CredencialRechazadaError>>;
  /** Cierra la sesión del backend en este dispositivo (Firebase Auth). */
  cerrarSesion(): Promise<void>;
}

import type { Result } from '@/shared/kernel/Result';

import type { LoginCanceladoError, ProveedorNoDisponibleError, SesionNoRestauradaError, SinConexionError } from './errors';

/** Puerto: abre el selector del proveedor (Google) y entrega un idToken. */
export interface ProveedorDeIdentidad {
  obtenerIdToken(): Promise<Result<string, LoginCanceladoError | ProveedorNoDisponibleError>>;
  /** Sin abrir ninguna pantalla: un idToken nuevo si el proveedor aún recuerda al usuario (al reabrir la app). */
  obtenerIdTokenSilencioso(): Promise<Result<string, SesionNoRestauradaError | ProveedorNoDisponibleError | SinConexionError>>;
  /** Olvida al usuario en el dispositivo, para que la próxima vez el selector pida elegir cuenta. */
  cerrarSesion(): Promise<void>;
  /** Desvincula la app de la cuenta de Google del usuario (al eliminar la cuenta). */
  revocarAcceso(): Promise<void>;
}

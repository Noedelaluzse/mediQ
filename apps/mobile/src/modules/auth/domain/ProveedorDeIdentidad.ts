import type { Result } from '@/shared/kernel/Result';

import type { LoginCanceladoError, ProveedorNoDisponibleError } from './errors';

/** Puerto: abre el selector del proveedor (Google) y entrega un idToken. */
export interface ProveedorDeIdentidad {
  obtenerIdToken(): Promise<Result<string, LoginCanceladoError | ProveedorNoDisponibleError>>;
}

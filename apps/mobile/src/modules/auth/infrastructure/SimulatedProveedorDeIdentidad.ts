import { ok, type Result } from '@/shared/kernel/Result';

import type { LoginCanceladoError, ProveedorNoDisponibleError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';

/** Simula el selector de Google (Expo Go no soporta el módulo nativo). Se reemplaza por el adaptador real. */
export class SimulatedProveedorDeIdentidad implements ProveedorDeIdentidad {
  async obtenerIdToken(): Promise<Result<string, LoginCanceladoError | ProveedorNoDisponibleError>> {
    await new Promise((r) => setTimeout(r, 600));
    return ok('simulated-google-id-token');
  }
}

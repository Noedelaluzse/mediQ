import { err, ok, type Result } from '@/shared/kernel/Result';

import { LoginCanceladoError, ProveedorNoDisponibleError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';

export type RespuestaGoogle =
  | { type: 'success'; data: { idToken: string | null } }
  | { type: 'cancelled' };

/** Lo mínimo que necesitamos del SDK de Google; el adaptador nativo lo implementa. */
export interface ClienteGoogle {
  signIn(): Promise<RespuestaGoogle>;
}

export class GoogleProveedorDeIdentidad implements ProveedorDeIdentidad {
  constructor(private readonly cliente: ClienteGoogle) {}

  async obtenerIdToken(): Promise<Result<string, LoginCanceladoError | ProveedorNoDisponibleError>> {
    try {
      const respuesta = await this.cliente.signIn();
      if (respuesta.type === 'cancelled') return err(new LoginCanceladoError());
      if (!respuesta.data.idToken) return err(new ProveedorNoDisponibleError());
      return ok(respuesta.data.idToken);
    } catch {
      return err(new ProveedorNoDisponibleError());
    }
  }
}

import { err, ok, type Result } from '@/shared/kernel/Result';

import { LoginCanceladoError, ProveedorNoDisponibleError, SesionNoRestauradaError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';

export type RespuestaGoogle =
  | { type: 'success'; data: { idToken: string | null } }
  | { type: 'cancelled' };

export type RespuestaGoogleSilenciosa =
  | { type: 'success'; data: { idToken: string | null } }
  | { type: 'noSavedCredentialFound' };

/** Lo mínimo que necesitamos del SDK de Google; el adaptador nativo lo implementa. */
export interface ClienteGoogle {
  signIn(): Promise<RespuestaGoogle>;
  signInSilently(): Promise<RespuestaGoogleSilenciosa>;
  signOut(): Promise<void>;
  revokeAccess(): Promise<void>;
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

  async obtenerIdTokenSilencioso(): Promise<Result<string, SesionNoRestauradaError | ProveedorNoDisponibleError>> {
    try {
      const respuesta = await this.cliente.signInSilently();
      if (respuesta.type === 'noSavedCredentialFound') return err(new SesionNoRestauradaError());
      if (!respuesta.data.idToken) return err(new ProveedorNoDisponibleError());
      return ok(respuesta.data.idToken);
    } catch {
      return err(new ProveedorNoDisponibleError());
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await this.cliente.signOut();
    } catch {
      // Cerrar sesión no debe fallar por el SDK.
    }
  }

  async revocarAcceso(): Promise<void> {
    try {
      await this.cliente.revokeAccess();
    } catch {
      // Desvincular Google no debe impedir terminar de eliminar la cuenta.
    }
  }
}

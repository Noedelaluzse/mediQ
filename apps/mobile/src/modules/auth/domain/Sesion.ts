import { err, ok, type Result } from '@/shared/kernel/Result';

import { SesionInvalidaError } from './errors';

export type Usuario = { id: string; nombre: string; email: string };

export type Sesion = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly usuario: Usuario;
  /** Verdadero hasta que el usuario acepta el aviso de privacidad en su primer inicio de sesión. */
  readonly primeraVez: boolean;
};

export function crearSesion(input: Sesion): Result<Sesion, SesionInvalidaError> {
  if (!input.accessToken.trim() || !input.refreshToken.trim()) {
    return err(new SesionInvalidaError('La sesión necesita access y refresh token'));
  }
  if (!input.usuario.id.trim()) {
    return err(new SesionInvalidaError('La sesión necesita un usuario'));
  }
  return ok(input);
}

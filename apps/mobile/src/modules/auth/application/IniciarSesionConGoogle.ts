import { err, ok, type Result } from '@/shared/kernel/Result';

import type { AuthRepository } from '../domain/AuthRepository';
import type { LoginCanceladoError, CredencialRechazadaError, ServidorNoDisponibleError } from '../domain/errors';
import type { ProveedorDeIdentidad } from '../domain/ProveedorDeIdentidad';
import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

type Fallo = LoginCanceladoError | ServidorNoDisponibleError | CredencialRechazadaError;

export class IniciarSesionConGoogle {
  constructor(
    private readonly identidad: ProveedorDeIdentidad,
    private readonly auth: AuthRepository,
    private readonly sesiones: SesionStore,
  ) {}

  async ejecutar(): Promise<Result<Sesion, Fallo>> {
    const token = await this.identidad.obtenerIdToken();
    if (!token.ok) return err(token.error);

    const sesion = await this.auth.autenticarConGoogle(token.value);
    if (!sesion.ok) return err(sesion.error);

    await this.sesiones.guardar(sesion.value);
    return ok(sesion.value);
  }
}

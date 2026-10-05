import { err, ok, type Result } from '@/shared/kernel/Result';

import type { AuthRepository } from '../domain/AuthRepository';
import { CredencialRechazadaError, type ServidorNoDisponibleError } from '../domain/errors';
import { crearSesion, type Sesion } from '../domain/Sesion';

/** Simula POST /auth/google hasta que exista la API. La primera llamada del proceso es "primera vez". */
export class SimulatedAuthRepository implements AuthRepository {
  private yaVisto = false;

  async autenticarConGoogle(
    idToken: string,
  ): Promise<Result<Sesion, ServidorNoDisponibleError | CredencialRechazadaError>> {
    await new Promise((r) => setTimeout(r, 400));
    if (!idToken) return err(new CredencialRechazadaError());

    const primeraVez = !this.yaVisto;
    this.yaVisto = true;
    const sesion = crearSesion({
      accessToken: 'simulated-access-token',
      refreshToken: 'simulated-refresh-token',
      usuario: { id: 'simulated-user', nombre: 'Paciente de prueba', email: 'paciente@ejemplo.com' },
      primeraVez,
    });
    return sesion.ok ? ok(sesion.value) : err(new CredencialRechazadaError());
  }

  async cerrarSesion(): Promise<void> {
    this.yaVisto = false;
  }
}

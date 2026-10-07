import type { Biometria, ResultadoBiometrico } from '../domain/Candado';

export const MENSAJE_DE_DESBLOQUEO = 'Desbloquea MediQ';

/** F036: pide Face ID / huella (o el código del teléfono) para entrar a la app. */
export class DesbloquearConBiometria {
  constructor(private readonly biometria: Biometria) {}

  ejecutar(): Promise<ResultadoBiometrico> {
    return this.biometria.autenticar(MENSAJE_DE_DESBLOQUEO);
  }
}

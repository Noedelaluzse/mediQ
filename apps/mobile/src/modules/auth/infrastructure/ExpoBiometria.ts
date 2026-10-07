import * as LocalAuthentication from 'expo-local-authentication';

import type { Biometria, Disponibilidad, ResultadoBiometrico } from '../domain/Candado';

/** Face ID / huella del teléfono con `expo-local-authentication`; si falla la biometría, iOS ofrece el código del teléfono. */
export class ExpoBiometria implements Biometria {
  async disponibilidad(): Promise<Disponibilidad> {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'sinSensor';
    return (await LocalAuthentication.isEnrolledAsync()) ? 'disponible' : 'sinRegistro';
  }

  async autenticar(mensaje: string): Promise<ResultadoBiometrico> {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: mensaje, cancelLabel: 'Cancelar', fallbackLabel: 'Usar el código' });
    if (r.success) return 'ok';
    if (r.error === 'user_cancel' || r.error === 'system_cancel' || r.error === 'app_cancel') return 'cancelado';
    if (r.error === 'not_enrolled' || r.error === 'not_available' || r.error === 'passcode_not_set') return 'noDisponible';
    return 'fallo';
  }
}

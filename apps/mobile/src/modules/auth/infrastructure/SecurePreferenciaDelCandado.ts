import * as SecureStore from 'expo-secure-store';

import type { PreferenciaDelCandado, PreferenciaDelCandadoStore } from '../domain/Candado';
import { leerPreferencia } from './preferenciaDelCandado';

const LLAVE = 'mediq.candado';

/** Guarda en el Keychain si el candado está activado: así no se puede apagar editando archivos de la app. */
export class SecurePreferenciaDelCandado implements PreferenciaDelCandadoStore {
  async leer(): Promise<PreferenciaDelCandado> {
    return leerPreferencia(await SecureStore.getItemAsync(LLAVE));
  }

  async guardar(preferencia: PreferenciaDelCandado): Promise<void> {
    await SecureStore.setItemAsync(LLAVE, JSON.stringify(preferencia));
  }

  async limpiar(): Promise<void> {
    await SecureStore.deleteItemAsync(LLAVE);
  }
}

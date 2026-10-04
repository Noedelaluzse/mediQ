import * as SecureStore from 'expo-secure-store';

import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

const LLAVE = 'mediq.sesion';

/** Guarda la sesión en Keychain / Keystore (RNF-02), nunca en AsyncStorage. */
export class SecureSesionStore implements SesionStore {
  async guardar(sesion: Sesion): Promise<void> {
    await SecureStore.setItemAsync(LLAVE, JSON.stringify(sesion));
  }

  async leer(): Promise<Sesion | null> {
    const raw = await SecureStore.getItemAsync(LLAVE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Sesion;
    } catch {
      await SecureStore.deleteItemAsync(LLAVE);
      return null;
    }
  }

  async borrar(): Promise<void> {
    await SecureStore.deleteItemAsync(LLAVE);
  }
}

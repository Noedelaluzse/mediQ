import * as SecureStore from 'expo-secure-store';

import { leerPreferenciaDeTema, type AlmacenDePreferenciaDeTema, type PreferenciaDeTema } from './preferencia';

const LLAVE = 'mediq.tema';

export class SecureAlmacenDePreferenciaDeTema implements AlmacenDePreferenciaDeTema {
  async leer(): Promise<PreferenciaDeTema> {
    return leerPreferenciaDeTema(await SecureStore.getItemAsync(LLAVE));
  }

  async guardar(preferencia: PreferenciaDeTema): Promise<void> {
    await SecureStore.setItemAsync(LLAVE, preferencia);
  }
}

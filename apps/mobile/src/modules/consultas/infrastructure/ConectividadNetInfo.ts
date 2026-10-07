import NetInfo from '@react-native-community/netinfo';

import type { Conectividad } from '@/shared/kernel/Conectividad';

import { hayInternet } from './estadoDeRed';

/** ¿Hay internet? con `@react-native-community/netinfo` (módulo nativo: solo en el teléfono, no se importa en las pruebas de Node). */
export class ConectividadNetInfo implements Conectividad {
  async estaConectado(): Promise<boolean> {
    return hayInternet(await NetInfo.fetch());
  }

  suscribir(alCambiar: (conectado: boolean) => void): () => void {
    return NetInfo.addEventListener((estado) => alCambiar(hayInternet(estado)));
  }
}

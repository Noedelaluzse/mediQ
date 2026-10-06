import * as Notifications from 'expo-notifications';

import { PREFIJO_DE_AVISOS } from '../domain/AvisoDeCita';
import type { AvisoLocal } from '../domain/AvisoLocal';
import type { EstadoDelPermiso, ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { PREFIJO_DE_TOMAS } from '../domain/Toma';

const aEstado = (p: Notifications.NotificationPermissionsStatus): EstadoDelPermiso => ({ concedido: p.granted, puedePreguntar: p.canAskAgain });

/** Con la app abierta también se muestra el aviso (por defecto el sistema lo escondería). Llamar una vez al arrancar. */
export function mostrarAvisosConLaAppAbierta(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Notificaciones locales con expo-notifications: se quedan en el teléfono, sin servidor ni notificaciones push. */
export class ProgramadorDeAvisosExpo implements ProgramadorDeAvisos {
  async permiso(): Promise<EstadoDelPermiso> {
    return aEstado(await Notifications.getPermissionsAsync());
  }

  async pedirPermiso(): Promise<EstadoDelPermiso> {
    return aEstado(await Notifications.requestPermissionsAsync());
  }

  async reemplazar(avisos: AvisoLocal[], prefijo: string): Promise<void> {
    await this.cancelarConPrefijo([prefijo]);
    for (const a of avisos) {
      await Notifications.scheduleNotificationAsync({
        identifier: a.id,
        content: { title: a.titulo, body: a.cuerpo, data: { consultaId: a.consultaId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.cuando },
      });
    }
  }

  /** Solo cancela los avisos de MediQ (los que llevan un prefijo conocido), no cualquier otra notificación. */
  async cancelarTodos(): Promise<void> {
    await this.cancelarConPrefijo([PREFIJO_DE_AVISOS, PREFIJO_DE_TOMAS]);
  }

  private async cancelarConPrefijo(prefijos: string[]): Promise<void> {
    const pendientes = await Notifications.getAllScheduledNotificationsAsync();
    for (const p of pendientes) {
      if (prefijos.some((x) => p.identifier.startsWith(x))) await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }
  }
}

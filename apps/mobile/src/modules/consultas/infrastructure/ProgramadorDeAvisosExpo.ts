import * as Notifications from 'expo-notifications';

import { PREFIJO_DE_AVISOS, type AvisoDeCita } from '../domain/AvisoDeCita';
import type { EstadoDelPermiso, ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';

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

  async reemplazar(avisos: AvisoDeCita[]): Promise<void> {
    await this.cancelarTodos();
    for (const a of avisos) {
      await Notifications.scheduleNotificationAsync({
        identifier: a.id,
        content: { title: a.titulo, body: a.cuerpo, data: { consultaId: a.consultaId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.cuando },
      });
    }
  }

  /** Solo cancela los avisos de citas (los que llevan el prefijo), no cualquier otra notificación. */
  async cancelarTodos(): Promise<void> {
    const pendientes = await Notifications.getAllScheduledNotificationsAsync();
    for (const p of pendientes) {
      if (p.identifier.startsWith(PREFIJO_DE_AVISOS)) await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }
  }
}

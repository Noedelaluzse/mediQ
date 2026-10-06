import * as Notifications from 'expo-notifications';

import { PREFIJO_DE_AVISOS } from '../domain/AvisoDeCita';
import type { AvisoLocal } from '../domain/AvisoLocal';
import type { EstadoDelPermiso, ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { aDatosDeAviso, ACCION_POSPONER, ACCION_TOMADA } from '../domain/DatosDeAviso';
import { CATEGORIA_DE_TOMA, PREFIJO_DE_POSPUESTOS, PREFIJO_DE_TOMAS } from '../domain/Toma';

const aEstado = (p: Notifications.NotificationPermissionsStatus): EstadoDelPermiso => ({ concedido: p.granted, puedePreguntar: p.canAskAgain });

/** Con la app abierta también se muestra el aviso (por defecto el sistema lo escondería). Llamar una vez al arrancar. */
export function mostrarAvisosConLaAppAbierta(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/**
 * Registra los botones del aviso de toma («Ya la tomé» y «Recordar en 5 min»). Los dos abren la app un instante: así el registro
 * se guarda con seguridad (con la app cerrada, iOS no garantiza que el código de un botón en segundo plano llegue a correr).
 * Llamar una vez al arrancar.
 */
export function registrarCategoriasDeAvisos(): void {
  void Notifications.setNotificationCategoryAsync(CATEGORIA_DE_TOMA, [
    { identifier: ACCION_TOMADA, buttonTitle: 'Ya la tomé', options: { opensAppToForeground: true } },
    { identifier: ACCION_POSPONER, buttonTitle: 'Recordar en 5 min', options: { opensAppToForeground: true } },
  ]);
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
    for (const a of avisos) await this.programar(a);
  }

  async programar(a: AvisoLocal): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      identifier: a.id,
      content: { title: a.titulo, body: a.cuerpo, data: aDatosDeAviso(a), ...(a.categoria ? { categoryIdentifier: a.categoria } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.cuando },
    });
  }

  async cancelar(ids: string[]): Promise<void> {
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id);
  }

  async idsPendientes(prefijo: string): Promise<string[]> {
    return (await Notifications.getAllScheduledNotificationsAsync()).map((p) => p.identifier).filter((id) => id.startsWith(prefijo));
  }

  /** Solo cancela los avisos de MediQ (los que llevan un prefijo conocido), no cualquier otra notificación. */
  async cancelarTodos(): Promise<void> {
    await this.cancelarConPrefijo([PREFIJO_DE_AVISOS, PREFIJO_DE_TOMAS, PREFIJO_DE_POSPUESTOS]);
  }

  private async cancelarConPrefijo(prefijos: string[]): Promise<void> {
    const pendientes = await Notifications.getAllScheduledNotificationsAsync();
    for (const p of pendientes) {
      if (prefijos.some((x) => p.identifier.startsWith(x))) await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }
  }
}

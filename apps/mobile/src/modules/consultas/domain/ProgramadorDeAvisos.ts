import type { AvisoLocal } from './AvisoLocal';

export interface EstadoDelPermiso {
  concedido: boolean;
  /** Falso si el sistema ya no deja volver a preguntar (el usuario lo negó antes): solo se activa desde Ajustes. */
  puedePreguntar: boolean;
}

/** Notificaciones locales del dispositivo (implementado con expo-notifications). No hay servidor. */
export interface ProgramadorDeAvisos {
  permiso(): Promise<EstadoDelPermiso>;
  /** Muestra la pregunta del sistema (solo la primera vez). */
  pedirPermiso(): Promise<EstadoDelPermiso>;
  /** Deja programados exactamente estos avisos de una familia (`prefijo`: citas o tomas): cancela los anteriores de esa familia y programa los nuevos. */
  reemplazar(avisos: AvisoLocal[], prefijo: string): Promise<void>;
  /** Programa un aviso suelto (el pospuesto); no toca los demás. */
  programar(aviso: AvisoLocal): Promise<void>;
  /** Cancela estos avisos si siguen pendientes. */
  cancelar(ids: string[]): Promise<void>;
  /** Ids de los avisos pendientes de una familia. */
  idsPendientes(prefijo: string): Promise<string[]>;
  /** Cancela todos los avisos de MediQ (citas y tomas): al cerrar sesión o eliminar la cuenta. */
  cancelarTodos(): Promise<void>;
}

import type { AvisoDeCita } from './AvisoDeCita';

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
  /** Deja programados exactamente estos avisos: cancela los avisos de citas anteriores y programa los nuevos. */
  reemplazar(avisos: AvisoDeCita[]): Promise<void>;
  cancelarTodos(): Promise<void>;
}

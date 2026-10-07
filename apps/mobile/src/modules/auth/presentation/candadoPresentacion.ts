import type { ResultadoBiometrico } from '../domain/Candado';
import type { EstadoDelCandado } from '../application/ObtenerEstadoDelCandado';

/** Qué muestra la fila del candado en el Perfil: la explicación de una línea y cómo queda el interruptor. */
export function filaDelCandado(estado: EstadoDelCandado | null): { subtitulo: string; encendido: boolean; habilitado: boolean } {
  if (estado === null) return { subtitulo: '', encendido: false, habilitado: false };
  // Apagarlo siempre se puede, aunque el teléfono ya no tenga Face ID.
  if (estado.activado) return { subtitulo: 'Activado: se pide al abrir MediQ.', encendido: true, habilitado: true };
  if (estado.disponibilidad === 'sinSensor') return { subtitulo: 'Este teléfono no tiene Face ID ni huella.', encendido: false, habilitado: false };
  if (estado.disponibilidad === 'sinRegistro') return { subtitulo: 'Registra tu cara o huella en Ajustes del teléfono.', encendido: false, habilitado: false };
  return { subtitulo: 'Pide verificarte al abrir MediQ.', encendido: false, habilitado: true };
}

export function mensajeDeActivacion(resultado: 'activado' | 'cancelado' | 'fallo' | 'noDisponible'): string | null {
  if (resultado === 'fallo') return 'No pudimos verificarte, así que el candado sigue desactivado. Inténtalo de nuevo.';
  if (resultado === 'noDisponible') return 'Registra tu cara o tu huella en los Ajustes del teléfono para poder usar el candado.';
  return null;
}

/** Texto bajo el botón «Desbloquear» según lo último que respondió el teléfono (null = nada que decir). */
export function mensajeDeDesbloqueo(resultado: ResultadoBiometrico | null): string | null {
  if (resultado === 'fallo') return 'No pudimos verificarte. Inténtalo de nuevo.';
  if (resultado === 'noDisponible') return 'Este teléfono ya no tiene Face ID, huella ni código para verificarte. Puedes cerrar sesión y volver a entrar con Google.';
  return null;
}

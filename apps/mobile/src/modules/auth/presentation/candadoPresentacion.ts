import type { ResultadoBiometrico } from '../domain/Candado';
import type { EstadoDelCandado } from '../application/ObtenerEstadoDelCandado';

/** Qué muestra la fila del candado en el Perfil: el estado, el botón que corresponde (null = ninguno) y una nota si hace falta. */
export function filaDelCandado(estado: EstadoDelCandado | null): { estado: string; boton: 'Activar' | 'Desactivar' | null; nota: string | null } {
  if (estado === null) return { estado: '', boton: null, nota: null };
  // Desactivar siempre se puede, aunque el teléfono ya no tenga Face ID.
  if (estado.activado) return { estado: 'Activado', boton: 'Desactivar', nota: null };
  if (estado.disponibilidad === 'sinSensor') return { estado: 'No disponible', boton: null, nota: 'Este teléfono no tiene Face ID ni huella.' };
  if (estado.disponibilidad === 'sinRegistro') return { estado: 'No disponible', boton: null, nota: 'Registra tu cara o tu huella en los Ajustes del teléfono para poder usarlo.' };
  return { estado: 'Desactivado', boton: 'Activar', nota: null };
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

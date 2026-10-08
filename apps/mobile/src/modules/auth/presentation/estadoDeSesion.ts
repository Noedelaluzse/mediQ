import type { Restauracion } from '../application/ObtenerSesionActual';
import type { Documento } from '../domain/Consentimiento';
import type { Sesion } from '../domain/Sesion';

export type EstadoDeSesion = 'cargando' | 'sinSesion' | 'avisoPendiente' | 'activa';

/** Lo que el proveedor guarda. `sinVerificar`: se entró con la sesión guardada sin poder comprobarla (sin internet, F052). */
export type EstadoGuardado = { sesion: Sesion | null; pendientes: Documento[]; sinVerificar: boolean };

export function derivarEstado(e: EstadoGuardado | undefined): EstadoDeSesion {
  if (e === undefined) return 'cargando';
  if (e.sesion === null) return 'sinSesion';
  return e.pendientes.length > 0 ? 'avisoPendiente' : 'activa';
}

/**
 * Lo que se lee al abrir la app. Sin verificar la sesión NO se consultan los consentimientos: esa consulta necesita internet, y si
 * fallara se asumiría que falta todo y se mandaría a «Antes de empezar» a alguien que ya había aceptado. Se comprueban al verificar.
 */
export async function restaurarEstado(
  restaurar: () => Promise<Restauracion>,
  pendientesDe: (sesion: Sesion) => Promise<Documento[]>,
): Promise<EstadoGuardado> {
  const { sesion, sinVerificar } = await restaurar();
  if (sesion === null) return { sesion: null, pendientes: [], sinVerificar: false };
  if (sinVerificar) return { sesion, pendientes: [], sinVerificar: true };
  return { sesion, pendientes: await pendientesDe(sesion), sinVerificar: false };
}

/** Al volver el internet se intenta verificar la sesión guardada: qué hacer con el resultado. */
export function accionTrasReintentar(nuevo: EstadoGuardado): 'cerrar-sesion' | 'mantener' | 'actualizar' {
  if (nuevo.sesion === null) return 'cerrar-sesion';
  return nuevo.sinVerificar ? 'mantener' : 'actualizar';
}

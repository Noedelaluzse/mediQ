import { SesionDesfasadaError } from './errors';
import type { Sesion } from './Sesion';

/**
 * Id del usuario con el que se leen y escriben sus datos (`mediq_users/{uid}`).
 * La fuente de verdad es Firebase Auth (`uidDeAuth`): es la identidad con la que el servidor aplica las reglas.
 * Si la sesión guardada en el teléfono dice otro uid, se corta con `SesionDesfasadaError` en lugar de consultar
 * con un uid equivocado (F039). Sin usuario en Auth (modo simulado, o aún sin restaurar) se usa el de la sesión guardada.
 */
export function usuarioActivoId(sesion: Sesion | null, uidDeAuth: string | null): string {
  if (!sesion) throw new Error('No hay sesión activa');
  if (uidDeAuth && uidDeAuth !== sesion.usuario.id) throw new SesionDesfasadaError();
  return sesion.usuario.id;
}

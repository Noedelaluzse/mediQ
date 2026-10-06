import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';

/** `bloqueado`: el usuario ya lo negó y el sistema no vuelve a preguntar; hay que activarlo en Ajustes. */
export type ResultadoDelPermiso = 'concedido' | 'denegado' | 'bloqueado';

/** RF-40: pide el permiso de notificaciones cuando el usuario guarda una consulta con próxima cita (decidido con el usuario). */
export class SolicitarPermisoDeAvisos {
  constructor(private readonly programador: ProgramadorDeAvisos) {}

  async ejecutar(): Promise<ResultadoDelPermiso> {
    const actual = await this.programador.permiso();
    if (actual.concedido) return 'concedido';
    if (!actual.puedePreguntar) return 'bloqueado';
    return (await this.programador.pedirPermiso()).concedido ? 'concedido' : 'denegado';
  }
}

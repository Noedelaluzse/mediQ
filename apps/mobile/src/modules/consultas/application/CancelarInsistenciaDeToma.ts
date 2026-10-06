import type { DatosDeToma } from '../domain/AvisoLocal';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { idDeInsistencia } from '../domain/Toma';

/** Abrir el aviso de una toma (sin tocar un botón) ya cuenta como verlo: no llega la insistencia. No registra la dosis como tomada. */
export class CancelarInsistenciaDeToma {
  constructor(private readonly programador: ProgramadorDeAvisos) {}

  async ejecutar(toma: DatosDeToma): Promise<void> {
    await this.programador.cancelar([idDeInsistencia(toma.tomaId)]);
  }
}

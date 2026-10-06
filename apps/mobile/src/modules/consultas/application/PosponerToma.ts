import type { DatosDeToma } from '../domain/AvisoLocal';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { avisoPospuesto, idDeInsistencia } from '../domain/Toma';

/** «Recordar en 5 min» (F027): reemplaza la insistencia original por un aviso nuevo 5 minutos después del toque (posponer otra vez lo mueve). */
export class PosponerToma {
  constructor(
    private readonly programador: ProgramadorDeAvisos,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(toma: DatosDeToma, consultaId: string): Promise<void> {
    await this.programador.cancelar([idDeInsistencia(toma.tomaId)]);
    await this.programador.programar(avisoPospuesto(toma, consultaId, this.ahora()));
  }
}

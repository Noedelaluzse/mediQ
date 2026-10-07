import type { DatosDeToma } from '../domain/AvisoLocal';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import { idDeInsistencia, idDePospuesto } from '../domain/Toma';

/**
 * «Ya la tomé» (F027, también desde la tarjeta «Hoy», F029): primero se cancelan el aviso de esa dosis (si se marca antes de su hora
 * todavía no sonó), su insistencia y el aviso pospuesto (ya no hay que insistir, aunque guardar falle) y después se registra la toma. Si guardar falla, el error sube para que la pantalla lo avise.
 */
export class RegistrarToma {
  constructor(
    private readonly registro: RegistroDeTomasRepository,
    private readonly programador: ProgramadorDeAvisos,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(toma: DatosDeToma, consultaId: string): Promise<void> {
    await this.programador.cancelar([toma.tomaId, idDeInsistencia(toma.tomaId), idDePospuesto(toma.tomaId)]);
    await this.registro.registrar({ tomaId: toma.tomaId, consultaId, indice: toma.indice, medicamento: toma.medicamento, dosis: toma.dosis, programadaPara: toma.programadaPara, tomadaEn: this.ahora() });
  }
}

import { err, ok, type Result } from '@/shared/kernel/Result';

import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError } from '../domain/errors';

/** CU-06: elimina una consulta (borrado lógico: sale del diario, de los contadores y de la próxima cita). */
export class EliminarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly detalle: DetalleDeConsultaRepository,
  ) {}

  async ejecutar(consultaId: string): Promise<Result<void, ConsultaNoEncontradaError>> {
    if (!(await this.detalle.obtener(consultaId))) return err(new ConsultaNoEncontradaError());
    await this.consultas.eliminar(consultaId);
    return ok(undefined);
  }
}

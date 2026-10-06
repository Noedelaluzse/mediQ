import { err, ok, type Result } from '@/shared/kernel/Result';

import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError } from '../domain/errors';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';

/** CU-06: elimina una consulta (borrado lógico: sale del diario, de los contadores y de la próxima cita) y sus recordatorios de toma. */
export class EliminarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly detalle: DetalleDeConsultaRepository,
    private readonly recordatorios: RecordatoriosDeTomaRepository,
  ) {}

  async ejecutar(consultaId: string): Promise<Result<void, ConsultaNoEncontradaError>> {
    if (!(await this.detalle.obtener(consultaId))) return err(new ConsultaNoEncontradaError());
    // Primero los recordatorios: si falla, la consulta sigue y se puede reintentar sin dejar avisos de algo que ya no existe.
    await this.recordatorios.quitarDe(consultaId);
    await this.consultas.eliminar(consultaId);
    return ok(undefined);
  }
}

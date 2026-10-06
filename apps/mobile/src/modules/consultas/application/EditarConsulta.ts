import type { DomainError } from '@/shared/kernel/DomainError';
import { err, ok, type Result } from '@/shared/kernel/Result';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError } from '../domain/errors';
import type { LugaresParaConsulta, MedicosParaConsulta } from '../domain/puertos';
import { prepararConsulta, type EntradaRegistrarConsulta } from './prepararConsulta';

/**
 * CU-06: cambia los datos de una consulta con las mismas validaciones que al registrarla. Las indicaciones no se
 * editan aquí (se marcan y agregan en el detalle), así no se pierden las que ya están hechas.
 */
export class EditarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly detalle: DetalleDeConsultaRepository,
    private readonly medicos: MedicosParaConsulta,
    private readonly lugares: LugaresParaConsulta,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(consultaId: string, e: EntradaRegistrarConsulta): Promise<Result<Consulta, DomainError>> {
    if (!(await this.detalle.obtener(consultaId))) return err(new ConsultaNoEncontradaError());
    const consulta = await prepararConsulta(e, consultaId, [], { medicos: this.medicos, lugares: this.lugares, ahora: this.ahora });
    if (!consulta.ok) return consulta;
    await this.consultas.actualizar(consulta.value);
    return ok(consulta.value);
  }
}

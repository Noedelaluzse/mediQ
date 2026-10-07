import type { DomainError } from '@/shared/kernel/DomainError';
import { ok, type Result } from '@/shared/kernel/Result';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { crearIndicacion, type Indicacion } from '../domain/Indicacion';
import type { LugaresParaConsulta, MedicosParaConsulta } from '../domain/puertos';
import { prepararConsulta, type EntradaRegistrarConsulta } from './prepararConsulta';

export type { EntradaRegistrarConsulta } from './prepararConsulta';

/**
 * CU-02: valida, guarda al médico y al lugar si son nuevos y persiste la consulta con sus indicaciones.
 * Con `idPrevio` (reenvío desde la cola de envío, F030) la consulta usa ese id y cada indicación deriva el suyo de él: así reenviar
 * una consulta que sí llegó, pero sin confirmación, reescribe los mismos documentos en vez de duplicarlos.
 */
export class RegistrarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly medicos: MedicosParaConsulta,
    private readonly lugares: LugaresParaConsulta,
    private readonly generarId: () => string,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(e: EntradaRegistrarConsulta, idPrevio?: string): Promise<Result<Consulta, DomainError>> {
    const indicaciones: Indicacion[] = [];
    for (const texto of (e.indicaciones ?? []).map((t) => t.trim()).filter(Boolean)) {
      const i = crearIndicacion({ id: idPrevio ? `${idPrevio}-${indicaciones.length}` : this.generarId(), texto, orden: indicaciones.length });
      if (!i.ok) return i;
      indicaciones.push(i.value);
    }

    const consulta = await prepararConsulta(e, idPrevio ?? this.generarId(), indicaciones, { medicos: this.medicos, lugares: this.lugares, ahora: this.ahora });
    if (!consulta.ok) return consulta;
    await this.consultas.guardar(consulta.value);
    return ok(consulta.value);
  }
}

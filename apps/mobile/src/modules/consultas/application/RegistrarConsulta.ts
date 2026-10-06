import type { DomainError } from '@/shared/kernel/DomainError';
import { ok, type Result } from '@/shared/kernel/Result';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { crearIndicacion, type Indicacion } from '../domain/Indicacion';
import type { LugaresParaConsulta, MedicosParaConsulta } from '../domain/puertos';
import { prepararConsulta, type EntradaRegistrarConsulta } from './prepararConsulta';

export type { EntradaRegistrarConsulta } from './prepararConsulta';

/** CU-02: valida, guarda al médico y al lugar si son nuevos y persiste la consulta con sus indicaciones. */
export class RegistrarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly medicos: MedicosParaConsulta,
    private readonly lugares: LugaresParaConsulta,
    private readonly generarId: () => string,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(e: EntradaRegistrarConsulta): Promise<Result<Consulta, DomainError>> {
    const indicaciones: Indicacion[] = [];
    for (const texto of (e.indicaciones ?? []).map((t) => t.trim()).filter(Boolean)) {
      const i = crearIndicacion({ id: this.generarId(), texto, orden: indicaciones.length });
      if (!i.ok) return i;
      indicaciones.push(i.value);
    }

    const consulta = await prepararConsulta(e, this.generarId(), indicaciones, { medicos: this.medicos, lugares: this.lugares, ahora: this.ahora });
    if (!consulta.ok) return consulta;
    await this.consultas.guardar(consulta.value);
    return ok(consulta.value);
  }
}

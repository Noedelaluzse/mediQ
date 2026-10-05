import { err, ok, type Result } from '@/shared/kernel/Result';

import { DemasiadasIndicacionesError, type IndicacionInvalidaError } from '../domain/errors';
import { crearIndicacion, MAXIMO_DE_INDICACIONES, type Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

/** Agrega una indicación al final de la lista de una consulta ya guardada (detalle, F015). */
export class AgregarIndicacion {
  constructor(
    private readonly indicaciones: IndicacionesRepository,
    private readonly generarId: () => string,
  ) {}

  async ejecutar(consultaId: string, texto: string): Promise<Result<Indicacion, IndicacionInvalidaError | DemasiadasIndicacionesError>> {
    const actuales = await this.indicaciones.listar(consultaId);
    if (actuales.length >= MAXIMO_DE_INDICACIONES) return err(new DemasiadasIndicacionesError());
    const orden = actuales.reduce((m, i) => Math.max(m, i.orden), -1) + 1;
    const nueva = crearIndicacion({ id: this.generarId(), texto, orden });
    if (!nueva.ok) return nueva;
    await this.indicaciones.guardar(consultaId, nueva.value);
    return ok(nueva.value);
  }
}

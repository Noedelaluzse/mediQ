import { err, ok, type Result } from '@/shared/kernel/Result';

import { IndicacionNoEncontradaError } from '../domain/errors';
import { alternarIndicacion, type Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

/** Marca una indicación como hecha o la devuelve a pendiente. */
export class AlternarIndicacion {
  constructor(
    private readonly indicaciones: IndicacionesRepository,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(consultaId: string, indicacionId: string): Promise<Result<Indicacion, IndicacionNoEncontradaError>> {
    const actual = (await this.indicaciones.listar(consultaId)).find((i) => i.id === indicacionId);
    if (!actual) return err(new IndicacionNoEncontradaError());
    const nueva = alternarIndicacion(actual, this.ahora());
    await this.indicaciones.guardar(consultaId, nueva);
    return ok(nueva);
  }
}

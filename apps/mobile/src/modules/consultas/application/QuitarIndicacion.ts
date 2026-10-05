import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

export class QuitarIndicacion {
  constructor(private readonly indicaciones: IndicacionesRepository) {}

  ejecutar(consultaId: string, indicacionId: string): Promise<void> {
    return this.indicaciones.quitar(consultaId, indicacionId);
  }
}

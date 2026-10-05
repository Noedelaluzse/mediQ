import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

export class ListarIndicaciones {
  constructor(private readonly indicaciones: IndicacionesRepository) {}

  async ejecutar(consultaId: string): Promise<Indicacion[]> {
    return (await this.indicaciones.listar(consultaId)).sort((a, b) => a.orden - b.orden);
  }
}

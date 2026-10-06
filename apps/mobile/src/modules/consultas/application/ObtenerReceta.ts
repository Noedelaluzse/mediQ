import type { Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';

export class ObtenerReceta {
  constructor(private readonly recetas: RecetaRepository) {}

  ejecutar(consultaId: string): Promise<Medicamento[]> {
    return this.recetas.obtener(consultaId);
  }
}

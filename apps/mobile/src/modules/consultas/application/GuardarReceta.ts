import { ok, type Result } from '@/shared/kernel/Result';

import type { DemasiadosMedicamentosError, MedicamentoInvalidoError } from '../domain/errors';
import { crearReceta, type EntradaDeMedicamento, type Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';

/** Guarda la receta completa de una consulta (CU-04). Una lista vacía quita la receta. */
export class GuardarReceta {
  constructor(private readonly recetas: RecetaRepository) {}

  async ejecutar(consultaId: string, entradas: EntradaDeMedicamento[]): Promise<Result<Medicamento[], MedicamentoInvalidoError | DemasiadosMedicamentosError>> {
    const receta = crearReceta(entradas);
    if (!receta.ok) return receta;
    if (receta.value.length === 0) await this.recetas.quitar(consultaId);
    else await this.recetas.guardar(consultaId, receta.value);
    return ok(receta.value);
  }
}

import { ok, type Result } from '@/shared/kernel/Result';

import type { DemasiadosMedicamentosError, MedicamentoInvalidoError, RecordatorioInvalidoError } from '../domain/errors';
import { crearReceta, type EntradaDeMedicamento, type Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { recordatorioDeMedicamento } from '../domain/Toma';

/**
 * Guarda la receta completa de una consulta (CU-04) y deja al día sus recordatorios de toma (RF-32). Una lista vacía quita la
 * receta. Los días del tratamiento cuentan desde que se activó el aviso: al volver a guardar se conserva ese inicio.
 */
export class GuardarReceta {
  constructor(
    private readonly recetas: RecetaRepository,
    private readonly recordatorios: RecordatoriosDeTomaRepository,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(consultaId: string, entradas: EntradaDeMedicamento[]): Promise<Result<Medicamento[], MedicamentoInvalidoError | RecordatorioInvalidoError | DemasiadosMedicamentosError>> {
    const previa = await this.recetas.obtener(consultaId);
    const ahora = this.ahora();
    // El inicio del aviso se conserva si el medicamento (misma posición y nombre) ya lo tenía activo; si no, empieza ahora.
    const conInicio = entradas.map((e, i) => {
      const antes = previa[i];
      const conservaInicio = e.recordar === true && antes?.recordar === true && antes.nombre === e.nombre.trim() && antes.recordarDesde;
      return e.recordar === true ? { ...e, recordarDesde: conservaInicio ? antes.recordarDesde : ahora } : e;
    });

    const receta = crearReceta(conInicio);
    if (!receta.ok) return receta;

    if (receta.value.length === 0) await this.recetas.quitar(consultaId);
    else await this.recetas.guardar(consultaId, receta.value);

    const recordatorios = receta.value.flatMap((m, i) => {
      const r = recordatorioDeMedicamento(m, consultaId, i, m.recordarDesde ?? ahora);
      return r ? [r] : [];
    });
    await this.recordatorios.reemplazarDe(consultaId, recordatorios);
    return ok(receta.value);
  }
}

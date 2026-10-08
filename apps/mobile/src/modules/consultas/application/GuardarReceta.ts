import { generarId as generarIdPorDefecto } from '@/shared/kernel/generarId';
import { ok, type Result } from '@/shared/kernel/Result';

import type { DemasiadosMedicamentosError, MedicamentoInvalidoError, RecordatorioInvalidoError } from '../domain/errors';
import { crearReceta, type EntradaDeMedicamento, type Medicamento } from '../domain/Receta';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { recordatorioDeMedicamento } from '../domain/Toma';

/**
 * Guarda la receta completa de una consulta (CU-04) y deja al día sus recordatorios de toma (RF-32). Una lista vacía quita la
 * receta. Los días del tratamiento cuentan desde que se activó el aviso: al volver a guardar se conserva ese inicio.
 * Cada medicamento tiene un id propio (su identidad, no su posición): de él cuelgan su recordatorio y las marcas de sus tomas (AUD-01).
 */
export class GuardarReceta {
  constructor(
    private readonly recetas: RecetaRepository,
    private readonly recordatorios: RecordatoriosDeTomaRepository,
    private readonly ahora: () => Date,
    private readonly generarId: () => string = generarIdPorDefecto,
  ) {}

  async ejecutar(consultaId: string, entradas: EntradaDeMedicamento[]): Promise<Result<Medicamento[], MedicamentoInvalidoError | RecordatorioInvalidoError | DemasiadosMedicamentosError>> {
    const previa = await this.recetas.obtener(consultaId);
    const ahora = this.ahora();
    const guardados = new Map(previa.flatMap((m) => (m.id ? [[m.id, m] as const] : [])));
    const usados = new Set<string>();
    const idNuevo = (): string => {
      let id = this.generarId();
      while (usados.has(id) || guardados.has(id)) id = this.generarId();
      usados.add(id);
      return id;
    };

    // Identidad (AUD-01): un medicamento es el mismo si trae el id de uno de esta receta Y conserva su nombre. Con otro nombre es un
    // medicamento nuevo (otra identidad, el tratamiento empieza ahora); cambiar dosis, frecuencia o duración no cambia nada de eso.
    // Un id que no es de esta receta, o repetido, no se respeta: el cliente no inventa identidades. La posición no cuenta.
    const conInicio = entradas.map((e) => {
      const antes = e.id && !usados.has(e.id) ? guardados.get(e.id) : undefined;
      const mismo = antes !== undefined && antes.nombre === e.nombre.trim();
      const id = mismo ? (e.id as string) : idNuevo();
      if (mismo) usados.add(id);
      // El inicio del aviso se conserva solo si es el mismo medicamento y ya lo tenía activo; si no, empieza ahora.
      const conservaInicio = mismo && e.recordar === true && antes.recordar === true && antes.recordarDesde;
      return e.recordar === true ? { ...e, id, recordarDesde: conservaInicio ? antes.recordarDesde : ahora } : { ...e, id };
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

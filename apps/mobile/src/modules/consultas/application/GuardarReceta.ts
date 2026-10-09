import { diagnostico } from '@/shared/kernel/diagnostico';
import { generarId as generarIdPorDefecto } from '@/shared/kernel/generarId';
import { ok, type Result } from '@/shared/kernel/Result';

import type { DemasiadosMedicamentosError, MedicamentoInvalidoError, RecordatorioInvalidoError } from '../domain/errors';
import { crearReceta, type EntradaDeMedicamento, type Medicamento } from '../domain/Receta';
import type { GuardadoDeRecetaRepository } from '../domain/GuardadoDeRecetaRepository';
import type { RecetaRepository } from '../domain/RecetaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import { esTomaDeMedicamento, recordatorioDeMedicamento } from '../domain/Toma';

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
    /** Para saber si un medicamento ya tiene dosis marcadas (sin él se asume que sí: lo conservador) y para borrar las de los que salen de la receta. */
    private readonly registro?: Pick<RegistroDeTomasRepository, 'tomadasDesde' | 'quitarDeMedicamento'>,
    /** Guarda receta, marca y recordatorios en una sola operación (AUD-03). Sin él, dos pasos seguidos: solo para el modo simulado y las pruebas sencillas. */
    private readonly guardado: GuardadoDeRecetaRepository = enDosPasos(recetas, recordatorios),
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

    // Identidad (AUD-01): un medicamento es el mismo si trae el id de uno de esta receta y (a) conserva su nombre, o (b) cambió de nombre
    // pero aún NO tiene dosis marcadas (un error de dedo corregido a tiempo: no hay nada que heredar por error). Con dosis ya marcadas,
    // otro nombre es un medicamento nuevo: otra identidad y el tratamiento empieza ahora. Cambiar dosis, frecuencia o duración no cambia
    // nada de eso. Un id que no es de esta receta, o repetido, no se respeta: el cliente no inventa identidades. La posición no cuenta.
    const renombrados = entradas.filter((e) => e.id && guardados.get(e.id) && guardados.get(e.id)?.nombre !== e.nombre.trim());
    const conMarcas = renombrados.length > 0 ? await this.idsConDosisMarcadas(consultaId, renombrados.flatMap((e) => (e.id ? [guardados.get(e.id) as Medicamento] : []))) : new Set<string>();

    const conInicio = entradas.map((e) => {
      const antes = e.id && !usados.has(e.id) ? guardados.get(e.id) : undefined;
      const mismoNombre = antes !== undefined && antes.nombre === e.nombre.trim();
      const mismo = antes !== undefined && (mismoNombre || !conMarcas.has(antes.id as string));
      const id = mismo ? (e.id as string) : idNuevo();
      if (mismo) usados.add(id);
      // El inicio del aviso se conserva solo si es el mismo medicamento y ya lo tenía activo; si no, empieza ahora.
      const conservaInicio = mismo && e.recordar === true && antes.recordar === true && antes.recordarDesde;
      return e.recordar === true ? { ...e, id, recordarDesde: conservaInicio ? antes.recordarDesde : ahora } : { ...e, id };
    });

    const receta = crearReceta(conInicio);
    if (!receta.ok) return receta;

    const recordatorios = receta.value.flatMap((m, i) => {
      const r = recordatorioDeMedicamento(m, consultaId, i, m.recordarDesde ?? ahora);
      return r ? [r] : [];
    });
    // UNA sola operación (AUD-03): la receta, su marca y los recordatorios quedan juntos o no queda ninguno. Si falla, el error sube
    // y no se hace nada más: no se anuncia éxito parcial, no se borran marcas y se puede reintentar.
    await this.guardado.guardar(consultaId, receta.value, recordatorios);
    await this.borrarMarcasDeLosQueSalen(consultaId, previa, receta.value);
    return ok(receta.value);
  }

  /**
   * Los medicamentos (de los dados) que ya tienen alguna dosis marcada como tomada. Si no se puede leer el registro, se asume que TODOS
   * la tienen: es lo seguro (cambiar de nombre da un medicamento nuevo y nunca se hereda nada por error). Un medicamento sin aviso
   * nunca tuvo dosis, así que no se consulta por él.
   */
  private async idsConDosisMarcadas(consultaId: string, medicamentos: Medicamento[]): Promise<Set<string>> {
    const conAviso = medicamentos.filter((m) => m.id && m.recordar === true);
    const ids = new Set<string>();
    if (conAviso.length === 0) return ids;
    try {
      if (!this.registro) throw new Error('sin registro de tomas');
      const desde = new Date(Math.min(...conAviso.map((m) => (m.recordarDesde ?? new Date(0)).getTime())) - 86_400_000);
      const tomadas = await this.registro.tomadasDesde(desde);
      for (const m of conAviso) if (tomadas.some((t) => esTomaDeMedicamento(t.tomaId, consultaId, m.id as string))) ids.add(m.id as string);
    } catch {
      for (const m of conAviso) ids.add(m.id as string);
    }
    return ids;
  }

  /**
   * Un medicamento que ya no está en la receta (cambió de nombre con dosis marcadas, se quitó, o se quitó la receta) deja también sus
   * marcas «Ya la tomé»: sin su medicamento no se verían en ninguna parte y solo conservarían el nombre viejo (pedido del usuario). Es
   * limpieza: si falla (sin red) la receta ya quedó bien guardada y no se le avisa de nada al usuario.
   */
  private async borrarMarcasDeLosQueSalen(consultaId: string, previa: Medicamento[], nueva: Medicamento[]): Promise<void> {
    if (!this.registro) return;
    const siguen = new Set(nueva.flatMap((m) => (m.id ? [m.id] : [])));
    for (const m of previa) {
      if (!m.id || siguen.has(m.id)) continue;
      try {
        await this.registro.quitarDeMedicamento(consultaId, m.id);
      } catch (error) {
        diagnostico.advertir('receta: no se pudieron borrar las dosis marcadas de un medicamento que ya no está', error);
      }
    }
  }
}

/** Sin guardado atómico (modo simulado, pruebas sencillas): receta y recordatorios en dos pasos seguidos, SIN la garantía de «todo o nada». */
function enDosPasos(recetas: RecetaRepository, recordatorios: RecordatoriosDeTomaRepository): GuardadoDeRecetaRepository {
  return {
    async guardar(consultaId, medicamentos, lista) {
      if (medicamentos.length === 0) await recetas.quitar(consultaId);
      else await recetas.guardar(consultaId, medicamentos);
      await recordatorios.reemplazarDe(consultaId, lista);
    },
  };
}


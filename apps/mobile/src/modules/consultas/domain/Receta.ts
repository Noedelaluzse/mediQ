import { err, ok, type Result } from '@/shared/kernel/Result';

import { DemasiadosMedicamentosError, MedicamentoInvalidoError, RecordatorioInvalidoError } from './errors';
import { duracionEnDias, esHoraValida, horasDeToma } from './Toma';

export const MAXIMO_DE_MEDICAMENTOS = 20;
const LARGO_NOMBRE = 80;
const LARGO_CORTO = 60;
const LARGO_INDICACIONES = 300;

/** Un medicamento de la receta (RF-31). Solo el nombre es obligatorio. */
export interface Medicamento {
  /**
   * Identidad propia del medicamento (AUD-01, F062): no depende de su posición en la receta. De ella cuelgan su recordatorio y las
   * marcas «Ya la tomé» de sus dosis. La asigna `GuardarReceta`: cambiar el nombre es un medicamento nuevo (otro id); cambiar dosis,
   * frecuencia o duración es el mismo. Solo falta en lo que aún no se ha guardado.
   */
  id?: string;
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  via?: string;
  indicaciones?: string;
  /** RF-32: avisar a la hora de cada toma. */
  recordar?: boolean;
  /** Hora de la primera toma del día, «HH:mm». Solo con `recordar`. */
  primeraToma?: string;
  /** Cuándo se activó el aviso: los días del tratamiento cuentan desde aquí. */
  recordarDesde?: Date;
}

export type EntradaDeMedicamento = {
  /** El id con el que el formulario cargó el medicamento (para saber que es el mismo); en uno nuevo no hay. */
  id?: string;
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  via?: string;
  indicaciones?: string;
  recordar?: boolean;
  primeraToma?: string;
  recordarDesde?: Date;
};

const opcional = (texto: string | undefined, maximo: number): Result<string | undefined, MedicamentoInvalidoError> => {
  const limpio = texto?.trim();
  if (!limpio) return ok(undefined);
  return limpio.length > maximo ? err(new MedicamentoInvalidoError()) : ok(limpio);
};

export function crearMedicamento(e: EntradaDeMedicamento): Result<Medicamento, MedicamentoInvalidoError | RecordatorioInvalidoError> {
  const nombre = e.nombre.trim();
  if (!nombre || nombre.length > LARGO_NOMBRE) return err(new MedicamentoInvalidoError());
  const dosis = opcional(e.dosis, LARGO_CORTO);
  const frecuencia = opcional(e.frecuencia, LARGO_CORTO);
  const duracion = opcional(e.duracion, LARGO_CORTO);
  const via = opcional(e.via, LARGO_CORTO);
  const indicaciones = opcional(e.indicaciones, LARGO_INDICACIONES);
  for (const campo of [dosis, frecuencia, duracion, via, indicaciones]) if (!campo.ok) return campo;
  const valor = <T>(r: Result<T, MedicamentoInvalidoError>): T | undefined => (r.ok ? r.value : undefined);

  // RF-32: el aviso solo se puede calcular con una hora válida, una frecuencia del catálogo y una duración del catálogo.
  const recordar = e.recordar === true;
  if (recordar) {
    const calculable = e.primeraToma && esHoraValida(e.primeraToma) && valor(frecuencia) && horasDeToma(valor(frecuencia) as string, e.primeraToma) && duracionEnDias(valor(duracion)) !== null;
    if (!calculable) return err(new RecordatorioInvalidoError());
  }

  return ok({
    id: e.id?.trim() ? e.id.trim() : undefined,
    nombre,
    dosis: valor(dosis),
    frecuencia: valor(frecuencia),
    duracion: valor(duracion),
    via: valor(via),
    indicaciones: valor(indicaciones),
    recordar: recordar ? true : undefined,
    primeraToma: recordar ? e.primeraToma : undefined,
    recordarDesde: recordar ? e.recordarDesde : undefined,
  });
}

/** Valida todos los medicamentos: si uno falla, falla la receta entera. */
export function crearReceta(entradas: EntradaDeMedicamento[]): Result<Medicamento[], MedicamentoInvalidoError | RecordatorioInvalidoError | DemasiadosMedicamentosError> {
  if (entradas.length > MAXIMO_DE_MEDICAMENTOS) return err(new DemasiadosMedicamentosError());
  const medicamentos: Medicamento[] = [];
  for (const e of entradas) {
    const m = crearMedicamento(e);
    if (!m.ok) return m;
    medicamentos.push(m.value);
  }
  return ok(medicamentos);
}

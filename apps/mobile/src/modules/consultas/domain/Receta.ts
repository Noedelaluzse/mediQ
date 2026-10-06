import { err, ok, type Result } from '@/shared/kernel/Result';

import { DemasiadosMedicamentosError, MedicamentoInvalidoError } from './errors';

export const MAXIMO_DE_MEDICAMENTOS = 20;
const LARGO_NOMBRE = 80;
const LARGO_CORTO = 60;
const LARGO_INDICACIONES = 300;

/** Un medicamento de la receta (RF-31). Solo el nombre es obligatorio. */
export interface Medicamento {
  nombre: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  via?: string;
  indicaciones?: string;
}

export type EntradaDeMedicamento = { nombre: string; dosis?: string; frecuencia?: string; duracion?: string; via?: string; indicaciones?: string };

const opcional = (texto: string | undefined, maximo: number): Result<string | undefined, MedicamentoInvalidoError> => {
  const limpio = texto?.trim();
  if (!limpio) return ok(undefined);
  return limpio.length > maximo ? err(new MedicamentoInvalidoError()) : ok(limpio);
};

export function crearMedicamento(e: EntradaDeMedicamento): Result<Medicamento, MedicamentoInvalidoError> {
  const nombre = e.nombre.trim();
  if (!nombre || nombre.length > LARGO_NOMBRE) return err(new MedicamentoInvalidoError());
  const dosis = opcional(e.dosis, LARGO_CORTO);
  const frecuencia = opcional(e.frecuencia, LARGO_CORTO);
  const duracion = opcional(e.duracion, LARGO_CORTO);
  const via = opcional(e.via, LARGO_CORTO);
  const indicaciones = opcional(e.indicaciones, LARGO_INDICACIONES);
  for (const campo of [dosis, frecuencia, duracion, via, indicaciones]) if (!campo.ok) return campo;
  return ok({ nombre, dosis: dosis.ok ? dosis.value : undefined, frecuencia: frecuencia.ok ? frecuencia.value : undefined, duracion: duracion.ok ? duracion.value : undefined, via: via.ok ? via.value : undefined, indicaciones: indicaciones.ok ? indicaciones.value : undefined });
}

/** Valida todos los medicamentos: si uno falla, falla la receta entera. */
export function crearReceta(entradas: EntradaDeMedicamento[]): Result<Medicamento[], MedicamentoInvalidoError | DemasiadosMedicamentosError> {
  if (entradas.length > MAXIMO_DE_MEDICAMENTOS) return err(new DemasiadosMedicamentosError());
  const medicamentos: Medicamento[] = [];
  for (const e of entradas) {
    const m = crearMedicamento(e);
    if (!m.ok) return m;
    medicamentos.push(m.value);
  }
  return ok(medicamentos);
}

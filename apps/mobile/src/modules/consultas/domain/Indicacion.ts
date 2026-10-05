import { err, ok, type Result } from '@/shared/kernel/Result';

import { IndicacionInvalidaError } from './errors';

export const MAXIMO_DE_INDICACIONES = 30;
const LARGO_MAXIMO = 300;

/** Una tarea que el médico pidió hacer (RF-15). Se marca como hecha con `hechaEn`. */
export interface Indicacion {
  id: string;
  texto: string;
  orden: number;
  hechaEn?: Date;
}

export const crearIndicacion = (d: { id: string; texto: string; orden: number }): Result<Indicacion, IndicacionInvalidaError> => {
  const texto = d.texto.trim();
  if (!texto || texto.length > LARGO_MAXIMO) return err(new IndicacionInvalidaError());
  return ok({ id: d.id, texto, orden: d.orden, hechaEn: undefined });
};

/** Marca una pendiente (con la fecha de hoy) o desmarca una hecha. */
export const alternarIndicacion = (i: Indicacion, ahora: Date): Indicacion => ({ ...i, hechaEn: i.hechaEn ? undefined : ahora });

/** "1 de 3 hechas"; sin indicaciones, vacío. */
export const resumenDeIndicaciones = (lista: Indicacion[]): string =>
  lista.length === 0 ? '' : `${lista.filter((i) => i.hechaEn).length} de ${lista.length} hechas`;

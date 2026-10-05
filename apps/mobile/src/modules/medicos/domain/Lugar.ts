import { err, ok, type Result } from '@/shared/kernel/Result';

import { NombreDeLugarInvalidoError } from './errors';

export interface Lugar {
  id: string;
  nombre: string;
}

const LARGO_MAXIMO = 80;

export const normalizarNombreDeLugar = (nombre: string): string => nombre.trim().replace(/\s+/g, ' ');

/** Clave para detectar lugares repetidos: sin mayúsculas, acentos ni espacios de más. */
export const claveDeLugar = (nombre: string): string =>
  normalizarNombreDeLugar(nombre)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const crearLugar = (d: { id: string; nombre: string }): Result<Lugar, NombreDeLugarInvalidoError> => {
  const nombre = normalizarNombreDeLugar(d.nombre);
  if (!nombre || nombre.length > LARGO_MAXIMO) return err(new NombreDeLugarInvalidoError());
  return ok({ id: d.id, nombre });
};

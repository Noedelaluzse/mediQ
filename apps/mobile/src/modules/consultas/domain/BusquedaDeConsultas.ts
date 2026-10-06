import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { normalizarTexto } from '@/shared/kernel/texto';

import type { ConsultaDelDiario } from './Diario';

/**
 * Lo que RF-17 permite buscar: médico, especialidad (por su nombre visible, p. ej. «Cardiología») y lugar.
 * No incluye el motivo ni «lo que me dijo» (decisión del usuario): para sumarlos basta agregarlos aquí.
 */
export const textoBuscable = (c: ConsultaDelDiario): string =>
  normalizarTexto([c.medicoNombre, nombreDeEspecialidad(c.especialidad), c.lugar].filter(Boolean).join(' '));

/** Filtra en el dispositivo (RF-17): todas las palabras escritas deben aparecer, sin acentos ni mayúsculas. Conserva el orden. */
export function buscarConsultas(consultas: ConsultaDelDiario[], texto: string): ConsultaDelDiario[] {
  const palabras = normalizarTexto(texto).split(' ').filter(Boolean);
  if (palabras.length === 0) return consultas;
  return consultas.filter((c) => {
    const buscable = textoBuscable(c);
    return palabras.every((p) => buscable.includes(p));
  });
}

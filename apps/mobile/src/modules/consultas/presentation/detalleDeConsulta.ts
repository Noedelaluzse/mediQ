import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { fechaYHoraLarga } from '@/shared/kernel/fechas';

import type { Consulta } from '../domain/Consulta';
import { alternarIndicacion, type Indicacion } from '../domain/Indicacion';
import { TIPOS_DE_MEDICO } from '../domain/TipoDeMedico';

export interface DatosDelEncabezado {
  fecha: string;
  titulo: string;
  chips: string[];
}

export function datosDelEncabezado(c: Consulta): DatosDelEncabezado {
  return {
    fecha: fechaYHoraLarga(c.fecha),
    titulo: c.motivo ?? 'Consulta',
    chips: [nombreDeEspecialidad(c.especialidad), TIPOS_DE_MEDICO.find((t) => t.valor === c.tipo)?.etiqueta ?? 'Otro', 'Presencial'],
  };
}

/** "Clínica del Sureste · Consultorio 204" */
export function lineaDelLugar(c: Consulta): string | undefined {
  const partes = [c.lugar?.nombre, c.consultorio ? `Consultorio ${c.consultorio}` : undefined].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : undefined;
}

/** La lista con una indicación marcada o desmarcada, para reflejarlo al instante en pantalla. */
export const conIndicacionAlternada = (lista: Indicacion[], id: string, ahora: Date): Indicacion[] =>
  lista.map((i) => (i.id === id ? alternarIndicacion(i, ahora) : i));

import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { fechaYHoraLarga } from '@/shared/kernel/fechas';

import type { Consulta } from '../domain/Consulta';
import { alternarIndicacion, type Indicacion } from '../domain/Indicacion';

export interface DatosDelEncabezado {
  fecha: string;
  titulo: string;
  chips: string[];
}

export function datosDelEncabezado(c: Consulta): DatosDelEncabezado {
  return {
    fecha: fechaYHoraLarga(c.fecha),
    titulo: c.motivo ?? 'Consulta',
    chips: [nombreDeEspecialidad(c.especialidad), 'Presencial'],
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

/** La lista sin esa indicación (la original no se modifica); un id que no está la deja igual. */
export const conIndicacionQuitada = (lista: Indicacion[], id: string): Indicacion[] => lista.filter((i) => i.id !== id);

/** El enlace de la sección Indicaciones: entra al modo en que se pueden quitar y sale de él. */
export const textoDelModoDeIndicaciones = (editando: boolean): 'Editar' | 'Listo' => (editando ? 'Listo' : 'Editar');

/** La confirmación del botón «Eliminar consulta» del final del detalle: avisa qué se pierde y que no se recupera desde la app. */
export const confirmacionDeEliminar = (): { titulo: string; mensaje: string; boton: string } => ({
  titulo: '¿Eliminar esta consulta?',
  mensaje: 'Se quitará de tu diario junto con sus indicaciones y sus recordatorios. No podrás recuperarla desde la app.',
  boton: 'Eliminar',
});

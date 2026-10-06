import { fechaConAnio } from '@/shared/kernel/fechas';

import { edadEn, ETIQUETA_DE_SEXO, etiquetaDeSangre, resumenDePendientes, TOTAL_DE_DATOS, type Alergias, type DatosDeSalud } from '../domain/DatosDeSalud';
import { isoAFecha } from './formularioDeSalud';

export interface FilaDeSalud {
  etiqueta: string;
  /** Texto principal; ausente si está pendiente o son etiquetas. */
  valor?: string;
  /** Texto secundario bajo el valor (la edad). */
  detalle?: string;
  etiquetas?: string[];
  pendiente: boolean;
}

const años = (n: number): string => `${n} ${n === 1 ? 'año' : 'años'}`;

const filaDeAlergias = (etiqueta: string, a: Alergias): FilaDeSalud => {
  if (a.items.length > 0) return { etiqueta, etiquetas: a.items, pendiente: false };
  if (a.sinConocidas) return { etiqueta, valor: 'Ninguna conocida', pendiente: false };
  return { etiqueta, pendiente: true };
};

/** Las 5 filas de la tarjeta «Mi salud» del Perfil, en orden; la edad se calcula al momento. */
export function filasDeSalud(d: DatosDeSalud, hoy: Date): FilaDeSalud[] {
  const edad = d.nacimiento ? edadEn(d.nacimiento, hoy) : null;
  return [
    d.nacimiento
      ? { etiqueta: 'Nacimiento', valor: fechaConAnio(isoAFecha(d.nacimiento)), ...(edad !== null ? { detalle: años(edad) } : {}), pendiente: false }
      : { etiqueta: 'Nacimiento', pendiente: true },
    d.sexo ? { etiqueta: 'Sexo', valor: ETIQUETA_DE_SEXO[d.sexo], pendiente: false } : { etiqueta: 'Sexo', pendiente: true },
    d.tipoDeSangre ? { etiqueta: 'Tipo de sangre', valor: etiquetaDeSangre(d.tipoDeSangre), pendiente: false } : { etiqueta: 'Tipo de sangre', pendiente: true },
    filaDeAlergias('Alergias', d.alergias),
    filaDeAlergias('Alergias a medicamentos', d.alergiasAMedicamentos),
  ];
}

export interface AvisoDeSalud {
  titulo: string;
  texto: string;
  /** De 0 a 1. */
  avance: number;
}

/** El recordatorio de datos pendientes; null cuando ya está todo (el aviso desaparece). */
export function avisoDeSalud(d: DatosDeSalud): AvisoDeSalud | null {
  const { faltan, llenos, completo } = resumenDePendientes(d);
  if (completo) return null;
  return {
    titulo: 'Completa tu información de salud',
    texto: `${faltan === 1 ? 'Te falta' : 'Te faltan'} ${faltan} de ${TOTAL_DE_DATOS} datos.`,
    avance: llenos / TOTAL_DE_DATOS,
  };
}

export const botonDeSalud = (d: DatosDeSalud): 'Llenar' | 'Editar' => (resumenDePendientes(d).llenos === 0 ? 'Llenar' : 'Editar');

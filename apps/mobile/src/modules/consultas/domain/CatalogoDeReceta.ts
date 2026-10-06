/**
 * Listas cerradas para capturar los medicamentos (vía, frecuencia, duración, dosis, frases de indicaciones) y los textos que
 * se guardan. Se elige en vez de escribir (menos errores); cada lista termina en «Otra…» para el caso raro. El texto guardado es
 * el mismo de siempre («Oral», «Cada 8 horas», «7 días»): no cambia el modelo ni las reglas de Firestore.
 */

/** Cada campo corto de un medicamento admite hasta 60 caracteres (reglas del dominio). */
export const MAXIMO_DE_TEXTO_CORTO = 60;

export const OTRA = 'Otra…';

export interface Opcion {
  valor: string;
  etiqueta: string;
  /** Explicación breve para quien no conoce el término. */
  ayuda?: string;
}

// --- Vía ---------------------------------------------------------------------------------------------------------------

export const VIAS: readonly Opcion[] = [
  { valor: 'Oral', etiqueta: 'Oral', ayuda: 'tomada, con agua' },
  { valor: 'Sublingual', etiqueta: 'Sublingual', ayuda: 'debajo de la lengua' },
  { valor: 'Tópica', etiqueta: 'Tópica', ayuda: 'en la piel' },
  { valor: 'Inyectada (músculo)', etiqueta: 'Inyectada (músculo)' },
  { valor: 'Inyectada (vena)', etiqueta: 'Inyectada (vena)' },
  { valor: 'Oftálmica', etiqueta: 'Oftálmica', ayuda: 'gotas en los ojos' },
  { valor: 'Ótica', etiqueta: 'Ótica', ayuda: 'gotas en los oídos' },
  { valor: 'Nasal', etiqueta: 'Nasal' },
  { valor: 'Inhalada', etiqueta: 'Inhalada' },
  { valor: 'Rectal', etiqueta: 'Rectal' },
  { valor: 'Vaginal', etiqueta: 'Vaginal' },
];

export const VIA_POR_DEFECTO = 'Oral';

// --- Dosis: cuánto se toma cada vez ------------------------------------------------------------------------------------

export const CANTIDADES_DE_DOSIS = ['½', '1', '2', '3'] as const;

interface UnidadDeDosis {
  valor: string;
  singular: string;
  plural: string;
}

export const UNIDADES_DE_DOSIS: readonly UnidadDeDosis[] = [
  { valor: 'tableta', singular: 'tableta', plural: 'tabletas' },
  { valor: 'cápsula', singular: 'cápsula', plural: 'cápsulas' },
  { valor: 'ml', singular: 'ml', plural: 'ml' },
  { valor: 'gota', singular: 'gota', plural: 'gotas' },
  { valor: 'aplicación', singular: 'aplicación', plural: 'aplicaciones' },
  { valor: 'inyección', singular: 'inyección', plural: 'inyecciones' },
  { valor: 'sobre', singular: 'sobre', plural: 'sobres' },
];

/** «½ tableta», «1 tableta», «2 tabletas»: singular hasta 1, plural después. */
export function dosisTexto(cantidad: string, unidad: string): string {
  const u = UNIDADES_DE_DOSIS.find((x) => x.valor === unidad);
  if (!u) return `${cantidad} ${unidad}`;
  return `${cantidad} ${cantidad === '1' || cantidad === '½' ? u.singular : u.plural}`;
}

// --- Frecuencia --------------------------------------------------------------------------------------------------------

export const FRECUENCIAS_CADA = [4, 6, 8, 12, 24] as const;
export const FRECUENCIAS_VECES = [1, 2, 3, 4] as const;
export const FRECUENCIAS_OTRAS = ['Una sola vez', 'Solo si hay dolor o fiebre', 'Antes de dormir'] as const;

export const frecuenciaCada = (horas: number): string => `Cada ${horas} horas`;
export const frecuenciaVeces = (veces: number): string => (veces === 1 ? '1 vez al día' : `${veces} veces al día`);

export const FRECUENCIA_POR_DEFECTO = frecuenciaCada(8);

// --- Duración ----------------------------------------------------------------------------------------------------------

export type UnidadDeDuracion = 'dias' | 'semanas' | 'meses';

export const UNIDADES_DE_DURACION: readonly { valor: UnidadDeDuracion; etiqueta: string; singular: string; plural: string }[] = [
  { valor: 'dias', etiqueta: 'días', singular: 'día', plural: 'días' },
  { valor: 'semanas', etiqueta: 'semanas', singular: 'semana', plural: 'semanas' },
  { valor: 'meses', etiqueta: 'meses', singular: 'mes', plural: 'meses' },
];

export const DURACIONES_ESPECIALES = ['Uso continuo', 'Hasta terminar el envase'] as const;

export const DURACIONES_RAPIDAS: readonly { cantidad: number; unidad: UnidadDeDuracion }[] = [
  { cantidad: 3, unidad: 'dias' },
  { cantidad: 5, unidad: 'dias' },
  { cantidad: 7, unidad: 'dias' },
  { cantidad: 10, unidad: 'dias' },
  { cantidad: 14, unidad: 'dias' },
  { cantidad: 1, unidad: 'meses' },
];

const LIMITES: Record<UnidadDeDuracion, number> = { dias: 365, semanas: 52, meses: 24 };
export const limiteDeDuracion = (unidad: UnidadDeDuracion): number => LIMITES[unidad];

export function duracionTexto(cantidad: number, unidad: UnidadDeDuracion): string {
  const u = UNIDADES_DE_DURACION.find((x) => x.valor === unidad) ?? UNIDADES_DE_DURACION[0];
  return `${cantidad} ${cantidad === 1 ? u.singular : u.plural}`;
}

// --- Indicaciones: frases de un toque ----------------------------------------------------------------------------------

export const INDICACIONES_RAPIDAS = ['Con alimentos', 'En ayunas', 'Antes de dormir', 'Evitar alcohol', 'Mucha agua'] as const;

const SEPARADOR = '. ';

const frases = (texto: string): string[] =>
  texto
    .split(/\.\s+|\.$/)
    .map((f) => f.trim())
    .filter(Boolean);

/** Agrega la frase al texto, o la quita si ya estaba; conserva lo que el usuario escribió a mano. */
export function alternarFrase(texto: string, frase: string): string {
  const actuales = frases(texto);
  return (actuales.includes(frase) ? actuales.filter((f) => f !== frase) : [...actuales, frase]).join(SEPARADOR);
}

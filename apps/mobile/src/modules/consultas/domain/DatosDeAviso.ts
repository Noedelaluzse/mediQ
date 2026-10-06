import type { AvisoLocal, DatosDeToma } from './AvisoLocal';

/** Identificadores de los botones de la categoría «toma» (los registra `registrarCategoriasDeAvisos`). */
export const ACCION_TOMADA = 'tomada';
export const ACCION_POSPONER = 'posponer';

type Datos = Record<string, unknown>;

/** Lo que se guarda dentro de la notificación (JSON: las fechas viajan como texto). */
export function aDatosDeAviso(a: AvisoLocal): Datos {
  if (!a.toma) return { consultaId: a.consultaId };
  return { consultaId: a.consultaId, toma: { ...a.toma, programadaPara: a.toma.programadaPara.toISOString() } };
}

function aToma(d: unknown): DatosDeToma | null {
  const t = d as Partial<Record<keyof DatosDeToma, unknown>> | undefined;
  if (!t || typeof t.tomaId !== 'string' || typeof t.indice !== 'number' || typeof t.medicamento !== 'string' || typeof t.programadaPara !== 'string') return null;
  const programadaPara = new Date(t.programadaPara);
  if (Number.isNaN(programadaPara.getTime())) return null;
  return { tomaId: t.tomaId, indice: t.indice, programadaPara, medicamento: t.medicamento, ...(typeof t.dosis === 'string' ? { dosis: t.dosis } : {}) };
}

export type RespuestaDeAviso =
  | { tipo: 'abrir'; consultaId: string; toma?: DatosDeToma }
  | { tipo: 'tomada' | 'posponer'; consultaId: string; toma: DatosDeToma };

/** Qué hacer con el toque del usuario: abrir la consulta (tocando el aviso) o uno de los botones. null si no hay nada que hacer. */
export function interpretarRespuesta(accion: string, datos: Datos | undefined): RespuestaDeAviso | null {
  const consultaId = datos?.consultaId;
  if (typeof consultaId !== 'string') return null;
  const toma = aToma(datos?.toma);
  if (accion === ACCION_TOMADA || accion === ACCION_POSPONER) return toma ? { tipo: accion === ACCION_TOMADA ? 'tomada' : 'posponer', consultaId, toma } : null;
  return toma ? { tipo: 'abrir', consultaId, toma } : { tipo: 'abrir', consultaId };
}

import { FRECUENCIAS_CADA, FRECUENCIAS_VECES, frecuenciaCada, frecuenciaVeces, interpretarDuracion } from './CatalogoDeReceta';
import type { AvisoLocal, DatosDeToma } from './AvisoLocal';

export type { DatosDeToma };

/** Los avisos de toma llevan este prefijo en su id: así se reconocen para reemplazarlos o cancelarlos. */
export const PREFIJO_DE_TOMAS = 'toma-';

/**
 * iOS solo admite 64 notificaciones locales programadas por app. Los avisos de cita usan hasta 20 (10 citas por 2); las tomas,
 * hasta 40. Se programan las más próximas y el resto se rellena solo cada vez que se abre la app.
 */
export const PRESUPUESTO_DE_TOMAS = 40;

/** Categoría de notificación con los botones «Ya la tomé» y «Recordar en 5 min». */
export const CATEGORIA_DE_TOMA = 'toma';
/** Si no responde, llega otro aviso a los 5 minutos (F027). Cuenta contra el presupuesto: cada toma ocupa 2 lugares. */
export const MINUTOS_DE_INSISTENCIA = 5;
/** Los avisos pospuestos («Recordar en 5 min») llevan otro prefijo: reprogramar las tomas (que reemplaza `toma-`) no debe borrarlos. */
export const PREFIJO_DE_POSPUESTOS = 'posponer-';

/** El recordatorio de toma de un medicamento de una receta (RF-32): qué, cuándo empieza, cuándo termina y a qué horas. */
export interface RecordatorioDeToma {
  consultaId: string;
  /** Identidad del medicamento (AUD-01, F062): de ella salen el id del recordatorio y el de cada toma. NO es su posición. */
  medicamentoId: string;
  /** Posición del medicamento en la receta: solo sirve para ordenar. */
  indice: number;
  medicamento: string;
  dosis?: string;
  frecuencia: string;
  /** Hora de la primera toma del día, «HH:mm». */
  primeraToma: string;
  /** Cuando se activó el aviso (los días del tratamiento cuentan desde aquí, decidido con el usuario). */
  desde: Date;
  hasta: Date;
}

const DIA_EN_MS = 86_400_000;

export const esHoraValida = (hora: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

const aMinutos = (hora: string): number => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
const aHora = (minutos: number): string => {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Las horas del día en que se toma, a partir de la hora de la primera toma. null si la frecuencia no se puede calcular
 * («Solo si hay dolor o fiebre», texto libre). Todos los pasos del catálogo dividen el día, así que se repiten igual cada día.
 */
export function horasDeToma(frecuencia: string, primeraToma: string): { horas: string[]; unaVez: boolean } | null {
  if (!esHoraValida(primeraToma)) return null;
  const inicio = aMinutos(primeraToma);
  const repartir = (paso: number) => ({ horas: Array.from({ length: Math.floor(24 / paso) }, (_, i) => aHora(inicio + i * paso * 60)), unaVez: false });

  const cada = FRECUENCIAS_CADA.find((h) => frecuenciaCada(h) === frecuencia);
  if (cada) return repartir(cada);
  const veces = FRECUENCIAS_VECES.find((n) => frecuenciaVeces(n) === frecuencia);
  if (veces) return repartir(24 / veces);
  if (frecuencia === 'Antes de dormir') return { horas: [primeraToma], unaVez: false };
  if (frecuencia === 'Una sola vez') return { horas: [primeraToma], unaVez: true };
  return null;
}

/** «7 días» → 7, «2 semanas» → 14, «1 mes» → 30. null si no es del catálogo (así el aviso siempre termina con el tratamiento). */
export function duracionEnDias(duracion: string | undefined): number | null {
  const d = duracion ? interpretarDuracion(duracion) : null;
  if (!d) return null;
  return d.cantidad * { dias: 1, semanas: 7, meses: 30 }[d.unidad];
}

export function recordatorioDeMedicamento(
  m: { id?: string; nombre: string; dosis?: string; frecuencia?: string; duracion?: string; recordar?: boolean; primeraToma?: string },
  consultaId: string,
  indice: number,
  desde: Date,
): RecordatorioDeToma | null {
  // Sin identidad no hay recordatorio: no se inventa una por posición (AUD-01).
  if (!m.id || !m.recordar || !m.frecuencia || !m.primeraToma || !horasDeToma(m.frecuencia, m.primeraToma)) return null;
  const dias = duracionEnDias(m.duracion);
  if (dias === null) return null;
  return { consultaId, medicamentoId: m.id, indice, medicamento: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, primeraToma: m.primeraToma, desde, hasta: new Date(desde.getTime() + dias * DIA_EN_MS) };
}

/** Todas las tomas de un recordatorio, de la primera a la última del tratamiento. */
export const dosisDeUno = (r: RecordatorioDeToma): Date[] => {
  const patron = horasDeToma(r.frecuencia, r.primeraToma);
  if (!patron) return [];
  const primerDia = new Date(r.desde.getFullYear(), r.desde.getMonth(), r.desde.getDate());
  const dias = Math.ceil((r.hasta.getTime() - primerDia.getTime()) / DIA_EN_MS) + 1;
  const tomas: Date[] = [];
  for (let d = 0; d <= dias; d++) {
    for (const hora of patron.horas) {
      const t = new Date(primerDia.getFullYear(), primerDia.getMonth(), primerDia.getDate() + d, Number(hora.slice(0, 2)), Number(hora.slice(3)));
      if (t.getTime() >= r.desde.getTime() && t.getTime() < r.hasta.getTime()) tomas.push(t);
    }
  }
  tomas.sort((a, b) => a.getTime() - b.getTime());
  return patron.unaVez ? tomas.slice(0, 1) : tomas;
};

const marca = (t: Date): string =>
  `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`;

/**
 * Id de una toma (y de su aviso): `toma-{consulta}-{idDelMedicamento}-{aaaammddhhmm}`. Lleva el id del medicamento y no su posición: así
 * un medicamento nuevo en la misma fila y a la misma hora no hereda las marcas «Ya la tomé» del anterior (AUD-01).
 */
export const idDeToma = (r: RecordatorioDeToma, t: Date): string => `${PREFIJO_DE_TOMAS}${r.consultaId}-${r.medicamentoId}-${marca(t)}`;

/** Los avisos de toma por programar: solo futuros y dentro del tratamiento, de los más próximos a los más lejanos, hasta el presupuesto. */
export function avisosDeToma(recordatorios: RecordatorioDeToma[], ahora: Date, limite: number = PRESUPUESTO_DE_TOMAS): AvisoLocal[] {
  const avisos: AvisoLocal[] = [];
  for (const r of recordatorios) {
    for (const t of dosisDeUno(r)) {
      if (t.getTime() <= ahora.getTime()) continue;
      const id = idDeToma(r, t);
      avisos.push({
        id,
        consultaId: r.consultaId,
        cuando: t,
        titulo: 'Hora de tu medicamento',
        cuerpo: r.dosis ? `${r.medicamento} · ${r.dosis}` : r.medicamento,
        categoria: CATEGORIA_DE_TOMA,
        toma: { tomaId: id, indice: r.indice, programadaPara: t, medicamento: r.medicamento, dosis: r.dosis },
      });
    }
  }
  return avisos.sort((a, b) => a.cuando.getTime() - b.cuando.getTime()).slice(0, limite);
}

const TITULO_DE_INSISTENCIA = '¿Ya tomaste tu medicamento?';
const cuerpoDeToma = (t: DatosDeToma): string => (t.dosis ? `${t.medicamento} · ${t.dosis}` : t.medicamento);
const enMinutos = (d: Date, minutos: number): Date => new Date(d.getTime() + minutos * 60_000);

export const idDeInsistencia = (tomaId: string): string => `${tomaId}-r`;
export const idDePospuesto = (tomaId: string): string => `${PREFIJO_DE_POSPUESTOS}${tomaId}`;

/** El aviso que llega MINUTOS_DE_INSISTENCIA después de una toma por si no respondió. Su id empieza con `toma-`: se reemplaza con las tomas. */
export function avisoDeInsistencia(a: AvisoLocal): AvisoLocal {
  return { ...a, id: idDeInsistencia(a.id), cuando: enMinutos(a.cuando, MINUTOS_DE_INSISTENCIA), titulo: TITULO_DE_INSISTENCIA };
}

/** «Recordar en 5 min»: un aviso nuevo `MINUTOS_DE_INSISTENCIA` después del toque (no de la hora de la toma). */
export function avisoPospuesto(toma: DatosDeToma, consultaId: string, ahora: Date): AvisoLocal {
  return {
    id: idDePospuesto(toma.tomaId),
    consultaId,
    cuando: enMinutos(ahora, MINUTOS_DE_INSISTENCIA),
    titulo: TITULO_DE_INSISTENCIA,
    cuerpo: cuerpoDeToma(toma),
    categoria: CATEGORIA_DE_TOMA,
    toma,
  };
}

export interface DosisAExcluir {
  /** Ids de toma (`tomaId`) ya registradas como tomadas. */
  tomadas: Set<string>;
  /** Ids de toma que se pospusieron: su insistencia original sobra, ya tienen un aviso pospuesto. */
  pospuestas: Set<string>;
}

/**
 * Lo que se deja programado: cada toma más su insistencia, en orden de hora. Como cada toma ocupa dos lugares, caben la mitad
 * (`PRESUPUESTO_DE_TOMAS / 2`). Una dosis ya tomada no avisa ni insiste; una pospuesta no repite su insistencia.
 */
export function avisosDeTomaConInsistencia(recordatorios: RecordatorioDeToma[], ahora: Date, excluir: DosisAExcluir): AvisoLocal[] {
  const tomas = avisosDeToma(recordatorios, ahora, Number.POSITIVE_INFINITY)
    .filter((a) => !excluir.tomadas.has(a.id))
    .slice(0, PRESUPUESTO_DE_TOMAS / 2);
  return tomas
    .flatMap((a) => (excluir.pospuestas.has(a.id) ? [a] : [a, avisoDeInsistencia(a)]))
    .sort((a, b) => a.cuando.getTime() - b.cuando.getTime());
}

const sinCeroInicial = (hora: string): string => `${Number(hora.slice(0, 2))}${hora.slice(2)}`;
const lista = (items: string[]): string => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);

/** «Te avisaremos a las 8:00, 16:00 y 0:00 durante 7 días»; null si no se puede calcular. */
export function resumenDeTomas(frecuencia: string, primeraToma: string, duracion: string): string | null {
  const patron = horasDeToma(frecuencia, primeraToma);
  if (!patron || duracionEnDias(duracion) === null) return null;
  const horas = patron.horas.map(sinCeroInicial);
  if (patron.unaVez) return `Te avisaremos una vez, a las ${horas[0]}`;
  return `Te avisaremos a las ${lista(horas)} durante ${duracion}`;
}

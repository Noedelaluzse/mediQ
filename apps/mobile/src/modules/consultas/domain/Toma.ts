import { FRECUENCIAS_CADA, FRECUENCIAS_VECES, frecuenciaCada, frecuenciaVeces, interpretarDuracion } from './CatalogoDeReceta';
import type { AvisoLocal } from './AvisoLocal';

/** Los avisos de toma llevan este prefijo en su id: así se reconocen para reemplazarlos o cancelarlos. */
export const PREFIJO_DE_TOMAS = 'toma-';

/**
 * iOS solo admite 64 notificaciones locales programadas por app. Los avisos de cita usan hasta 20 (10 citas por 2); las tomas,
 * hasta 40. Se programan las más próximas y el resto se rellena solo cada vez que se abre la app.
 */
export const PRESUPUESTO_DE_TOMAS = 40;

/** El recordatorio de toma de un medicamento de una receta (RF-32): qué, cuándo empieza, cuándo termina y a qué horas. */
export interface RecordatorioDeToma {
  consultaId: string;
  /** Posición del medicamento en la receta. */
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
  m: { nombre: string; dosis?: string; frecuencia?: string; duracion?: string; recordar?: boolean; primeraToma?: string },
  consultaId: string,
  indice: number,
  desde: Date,
): RecordatorioDeToma | null {
  if (!m.recordar || !m.frecuencia || !m.primeraToma || !horasDeToma(m.frecuencia, m.primeraToma)) return null;
  const dias = duracionEnDias(m.duracion);
  if (dias === null) return null;
  return { consultaId, indice, medicamento: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, primeraToma: m.primeraToma, desde, hasta: new Date(desde.getTime() + dias * DIA_EN_MS) };
}

const dosisDeUno = (r: RecordatorioDeToma): Date[] => {
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

/** Los avisos de toma por programar: solo futuros y dentro del tratamiento, de los más próximos a los más lejanos, hasta el presupuesto. */
export function avisosDeToma(recordatorios: RecordatorioDeToma[], ahora: Date, limite: number = PRESUPUESTO_DE_TOMAS): AvisoLocal[] {
  const avisos: AvisoLocal[] = [];
  for (const r of recordatorios) {
    for (const t of dosisDeUno(r)) {
      if (t.getTime() <= ahora.getTime()) continue;
      avisos.push({
        id: `${PREFIJO_DE_TOMAS}${r.consultaId}-${r.indice}-${marca(t)}`,
        consultaId: r.consultaId,
        cuando: t,
        titulo: 'Hora de tu medicamento',
        cuerpo: r.dosis ? `${r.medicamento} · ${r.dosis}` : r.medicamento,
      });
    }
  }
  return avisos.sort((a, b) => a.cuando.getTime() - b.cuando.getTime()).slice(0, limite);
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

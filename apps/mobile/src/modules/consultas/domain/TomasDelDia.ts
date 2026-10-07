import type { DatosDeToma } from './AvisoLocal';
import { dosisDeUno, idDeToma, type RecordatorioDeToma } from './Toma';

/** Una toma del día para la tarjeta «Hoy» (F029). */
export interface TomaDelDia {
  tomaId: string;
  consultaId: string;
  /** Lo que hace falta para marcarla o deshacerla (los mismos datos que lleva su aviso). */
  toma: DatosDeToma;
  estado: 'tomada' | 'atrasada' | 'pendiente';
  /** La hora real a la que se marcó; solo si está tomada. */
  tomadaEn?: Date;
}

const mismoDia = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Atrasada si ya pasó su hora y no se marcó; pendiente si aún no le toca. Una tomada es tomada aunque se haya marcado antes de su hora. */
const estadoDe = (programadaPara: Date, tomadaEn: Date | undefined, ahora: Date): TomaDelDia['estado'] =>
  tomadaEn ? 'tomada' : programadaPara.getTime() < ahora.getTime() ? 'atrasada' : 'pendiente';

/**
 * Las tomas de un día, en orden de hora (y de posición en la receta si coinciden). Solo las que caen dentro de cada tratamiento
 * (desde que se activó el aviso hasta su fin). `tomadas`: ids de toma ya marcadas → hora real.
 */
export function tomasDelDia(recordatorios: RecordatorioDeToma[], dia: Date, tomadas: Map<string, Date>, ahora: Date): TomaDelDia[] {
  const lista: (TomaDelDia & { orden: number })[] = [];
  for (const r of recordatorios) {
    for (const programadaPara of dosisDeUno(r)) {
      if (!mismoDia(programadaPara, dia)) continue;
      const tomaId = idDeToma(r, programadaPara);
      const tomadaEn = tomadas.get(tomaId);
      lista.push({
        tomaId,
        consultaId: r.consultaId,
        toma: { tomaId, indice: r.indice, programadaPara, medicamento: r.medicamento, dosis: r.dosis },
        estado: estadoDe(programadaPara, tomadaEn, ahora),
        ...(tomadaEn ? { tomadaEn } : {}),
        orden: r.indice,
      });
    }
  }
  lista.sort((a, b) => a.toma.programadaPara.getTime() - b.toma.programadaPara.getTime() || a.orden - b.orden || a.consultaId.localeCompare(b.consultaId));
  return lista.map(({ orden: _orden, ...t }) => t);
}

/** Pasa el tiempo sin volver a consultar: una pendiente se vuelve atrasada al llegar su hora. */
export const conEstadoActual = (tomas: TomaDelDia[], ahora: Date): TomaDelDia[] =>
  tomas.map((t) => (t.estado === 'tomada' ? t : { ...t, estado: estadoDe(t.toma.programadaPara, undefined, ahora) }));

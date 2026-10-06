import type { RecordatorioDeToma } from '../domain/Toma';

type FechaFirestore = { toDate: () => Date } | Date;
export type DocumentoDeRecordatorio = {
  visitId?: string;
  itemIndex?: number;
  medicationName?: string;
  dose?: string | null;
  frequency?: string;
  firstDoseTime?: string;
  startsAt?: FechaFirestore | unknown;
  endsAt?: FechaFirestore | unknown;
};

export const idDeRecordatorio = (consultaId: string, indice: number): string => `${consultaId}_${indice}`;

/** Documento de `medicationSchedules/{consultaId}_{indice}` (docs/11). `createdAt` y `updatedAt` los pone el repositorio. */
export const aDocumentoDeRecordatorio = (r: RecordatorioDeToma) => ({
  visitId: r.consultaId,
  itemIndex: r.indice,
  medicationName: r.medicamento,
  dose: r.dosis ?? null,
  frequency: r.frecuencia,
  firstDoseTime: r.primeraToma,
  startsAt: r.desde,
  endsAt: r.hasta,
});

const aFecha = (f: unknown): Date | undefined => {
  const fecha = f instanceof Date ? f : (f as { toDate?: () => Date } | undefined)?.toDate?.();
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : undefined;
};

/** null si falta algo o las fechas están dañadas: un documento roto no debe impedir que los demás avisen. */
export function deDocumentoDeRecordatorio(d: DocumentoDeRecordatorio): RecordatorioDeToma | null {
  const desde = aFecha(d.startsAt);
  const hasta = aFecha(d.endsAt);
  if (!d.visitId || typeof d.itemIndex !== 'number' || !d.medicationName || !d.frequency || !d.firstDoseTime || !desde || !hasta) return null;
  return { consultaId: d.visitId, indice: d.itemIndex, medicamento: d.medicationName, dosis: d.dose ?? undefined, frecuencia: d.frequency, primeraToma: d.firstDoseTime, desde, hasta };
}

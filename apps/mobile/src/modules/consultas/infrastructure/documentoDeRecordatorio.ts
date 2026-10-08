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

/** `{consulta}_{idDelMedicamento}`: por medicamento y no por posición (AUD-01); reescribir reemplaza, no duplica. */
export const idDeRecordatorio = (consultaId: string, medicamentoId: string): string => `${consultaId}_${medicamentoId}`;

/** Documento de `medicationSchedules/{consultaId}_{idDelMedicamento}` (docs/11); `itemIndex` solo ordena. `createdAt` y `updatedAt` los pone el repositorio. */
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

/**
 * null si falta algo o las fechas están dañadas: un documento roto no debe impedir que los demás avisen. La identidad del medicamento
 * sale del id del documento (`{consulta}_{medicamento}`), porque las reglas no admiten campos nuevos en el documento.
 */
export function deDocumentoDeRecordatorio(d: DocumentoDeRecordatorio, idDelDocumento: string): RecordatorioDeToma | null {
  const desde = aFecha(d.startsAt);
  const hasta = aFecha(d.endsAt);
  if (!d.visitId || typeof d.itemIndex !== 'number' || !d.medicationName || !d.frequency || !d.firstDoseTime || !desde || !hasta) return null;
  const prefijo = `${d.visitId}_`;
  const medicamentoId = idDelDocumento.startsWith(prefijo) ? idDelDocumento.slice(prefijo.length) : '';
  if (!medicamentoId) return null;
  return { consultaId: d.visitId, medicamentoId, indice: d.itemIndex, medicamento: d.medicationName, dosis: d.dose ?? undefined, frecuencia: d.frequency, primeraToma: d.firstDoseTime, desde, hasta };
}

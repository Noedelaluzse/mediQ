import type { TomaRegistrada } from '../domain/RegistroDeTomasRepository';

/** Documento de `doseLogs/{tomaId}` (docs/11). `createdAt` lo pone el repositorio. */
export const aDocumentoDeToma = (t: TomaRegistrada) => ({
  visitId: t.consultaId,
  itemIndex: t.indice,
  medicationName: t.medicamento,
  dose: t.dosis ?? null,
  scheduledFor: t.programadaPara,
  takenAt: t.tomadaEn,
});

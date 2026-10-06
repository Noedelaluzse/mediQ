import type { Medicamento } from '../domain/Receta';

type FechaFirestore = { toDate: () => Date } | Date;
type ItemDeDocumento = { name?: string; dose?: string | null; frequency?: string | null; duration?: string | null; route?: string | null; instructions?: string | null; remind?: boolean; firstDose?: string | null; remindFrom?: FechaFirestore | null };
export type DocumentoDeReceta = { items?: ItemDeDocumento[] };

/** Documento de `visits/{id}/prescriptions/receta` (docs/11). `remind`, `firstDose` y `remindFrom` guardan el recordatorio de toma (RF-32). */
export const aDocumentoDeReceta = (medicamentos: Medicamento[]) => ({
  items: medicamentos.map((m) => ({
    name: m.nombre,
    dose: m.dosis ?? null,
    frequency: m.frecuencia ?? null,
    duration: m.duracion ?? null,
    route: m.via ?? null,
    instructions: m.indicaciones ?? null,
    remind: m.recordar === true,
    firstDose: m.recordar ? (m.primeraToma ?? null) : null,
    remindFrom: m.recordar ? (m.recordarDesde ?? null) : null,
  })),
});

const aFecha = (f: FechaFirestore | null | undefined): Date | undefined => (f instanceof Date ? f : f?.toDate());

export const deDocumentoDeReceta = (d: DocumentoDeReceta): Medicamento[] =>
  (d.items ?? [])
    .filter((i) => i.name?.trim())
    .map((i) => ({
      nombre: i.name as string,
      dosis: i.dose ?? undefined,
      frecuencia: i.frequency ?? undefined,
      duracion: i.duration ?? undefined,
      via: i.route ?? undefined,
      indicaciones: i.instructions ?? undefined,
      ...(i.remind === true ? { recordar: true, primeraToma: i.firstDose ?? undefined, recordarDesde: aFecha(i.remindFrom) } : {}),
    }));

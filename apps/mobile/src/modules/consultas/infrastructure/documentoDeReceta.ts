import type { Medicamento } from '../domain/Receta';

type ItemDeDocumento = { name?: string; dose?: string | null; frequency?: string | null; duration?: string | null; route?: string | null; instructions?: string | null; remind?: boolean };
export type DocumentoDeReceta = { items?: ItemDeDocumento[] };

/** Documento de `visits/{id}/prescriptions/receta` (docs/11). `remind` queda en false: los recordatorios son de la fase 2. */
export const aDocumentoDeReceta = (medicamentos: Medicamento[]) => ({
  items: medicamentos.map((m) => ({
    name: m.nombre,
    dose: m.dosis ?? null,
    frequency: m.frecuencia ?? null,
    duration: m.duracion ?? null,
    route: m.via ?? null,
    instructions: m.indicaciones ?? null,
    remind: false,
  })),
});

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
    }));

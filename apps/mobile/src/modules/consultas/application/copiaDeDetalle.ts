import type { Consulta } from '../domain/Consulta';
import type { Indicacion } from '../domain/Indicacion';
import type { Medicamento } from '../domain/Receta';
import type { DetalleDeConsulta } from './ObtenerDetalleDeConsulta';

/**
 * Cómo se guarda en el teléfono el detalle de una consulta y su receta (F032): como texto JSON, con las fechas en ISO. Leer es
 * tolerante: un contenido dañado cuenta como «sin copia» y un elemento dañado se descarta, nunca rompe la pantalla.
 */
const aFecha = (v: unknown): Date | undefined => {
  if (typeof v !== 'string') return undefined;
  const f = new Date(v);
  return Number.isNaN(f.getTime()) ? undefined : f;
};
const iso = (f: Date | undefined): string | undefined => f?.toISOString();
const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const referencia = (v: unknown): { id: string; nombre: string } | undefined => {
  const r = v as { id?: unknown; nombre?: unknown } | null | undefined;
  return r && typeof r.id === 'string' && typeof r.nombre === 'string' ? { id: r.id, nombre: r.nombre } : undefined;
};
const sinIndefinidos = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function detalleATexto(d: DetalleDeConsulta | null): string {
  if (!d) return JSON.stringify({ detalle: null });
  const { indicaciones: _repetidas, ...consulta } = d.consulta;
  return JSON.stringify({
    detalle: {
      consulta: { ...consulta, fecha: iso(d.consulta.fecha), proximaCita: iso(d.consulta.proximaCita) },
      indicaciones: d.indicaciones.map((i) => ({ ...i, hechaEn: iso(i.hechaEn) })),
      telefonoDelMedico: d.telefonoDelMedico,
    },
  });
}

function indicacionDe(v: unknown): Indicacion | null {
  const i = v as { id?: unknown; texto?: unknown; orden?: unknown; hechaEn?: unknown } | null;
  if (!i || typeof i.id !== 'string' || typeof i.texto !== 'string' || typeof i.orden !== 'number') return null;
  const hechaEn = aFecha(i.hechaEn);
  return { id: i.id, texto: i.texto, orden: i.orden, ...(hechaEn ? { hechaEn } : {}) };
}

/** `{ detalle: null }` = la consulta ya no existe; `null` = no hay copia utilizable. */
export function detalleDeTexto(contenido: string): { detalle: DetalleDeConsulta | null } | null {
  try {
    const raiz = JSON.parse(contenido) as { detalle?: unknown } | null;
    if (!raiz || typeof raiz !== 'object' || !('detalle' in raiz)) return null;
    if (raiz.detalle === null) return { detalle: null };
    const g = raiz.detalle as { consulta?: Record<string, unknown>; indicaciones?: unknown; telefonoDelMedico?: unknown };
    const c = g?.consulta;
    const fecha = aFecha(c?.fecha);
    if (!c || typeof c.id !== 'string' || typeof c.especialidad !== 'string' || !fecha || !Array.isArray(g.indicaciones)) return null;
    const indicaciones = g.indicaciones.flatMap((i) => indicacionDe(i) ?? []);
    const consulta = sinIndefinidos({
      id: c.id,
      pacienteId: texto(c.pacienteId) ?? 'self',
      modo: 'presencial',
      tipo: texto(c.tipo) ?? 'general',
      especialidad: c.especialidad,
      fecha,
      medico: referencia(c.medico),
      lugar: referencia(c.lugar),
      consultorio: texto(c.consultorio),
      motivo: texto(c.motivo),
      notasDelMedico: texto(c.notasDelMedico),
      indicaciones,
      proximaCita: aFecha(c.proximaCita),
    }) as unknown as Consulta;
    const telefono = texto(g.telefonoDelMedico);
    return { detalle: { consulta, indicaciones, ...(telefono ? { telefonoDelMedico: telefono } : {}) } };
  } catch {
    return null;
  }
}

export const recetaATexto = (receta: Medicamento[]): string => JSON.stringify(receta.map((m) => ({ ...m, recordarDesde: iso(m.recordarDesde) })));

export function recetaDeTexto(contenido: string): Medicamento[] | null {
  try {
    const lista: unknown = JSON.parse(contenido);
    if (!Array.isArray(lista)) return null;
    return lista.flatMap((v) => {
      const m = v as Record<string, unknown> | null;
      if (!m || typeof m !== 'object' || typeof m.nombre !== 'string') return [];
      return [
        sinIndefinidos({
          nombre: m.nombre,
          dosis: texto(m.dosis),
          frecuencia: texto(m.frecuencia),
          duracion: texto(m.duracion),
          via: texto(m.via),
          indicaciones: texto(m.indicaciones),
          recordar: typeof m.recordar === 'boolean' ? m.recordar : undefined,
          primeraToma: texto(m.primeraToma),
          recordarDesde: aFecha(m.recordarDesde),
        }) as Medicamento,
      ];
    });
  } catch {
    return null;
  }
}

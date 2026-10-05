import { mesYAnio } from '@/shared/kernel/fechas';

/** Marca opaca: solo la infraestructura sabe qué hay dentro (en Firestore, el último documento leído). */
export type CursorDelDiario = { readonly __cursorDelDiario: true };

/** Lo que muestra una tarjeta del diario. */
export interface ConsultaDelDiario {
  id: string;
  fecha: Date;
  especialidad: string;
  tipo: string;
  medicoNombre?: string;
  lugar?: string;
  motivo?: string;
  notasDelMedico?: string;
}

export interface PaginaDelDiario {
  consultas: ConsultaDelDiario[];
  /** Presente solo si puede haber más consultas. */
  siguiente?: CursorDelDiario;
}

export interface GrupoDelMes {
  /** "2026-09": única y estable. */
  clave: string;
  /** "Septiembre 2026" */
  titulo: string;
  total: number;
  consultas: ConsultaDelDiario[];
}

const claveDelMes = (f: Date): string => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;

/** RF-12: de la más reciente a la más antigua, agrupadas por mes. */
export function agruparPorMes(consultas: ConsultaDelDiario[]): GrupoDelMes[] {
  const grupos = new Map<string, GrupoDelMes>();
  for (const c of [...consultas].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())) {
    const clave = claveDelMes(c.fecha);
    const grupo = grupos.get(clave) ?? { clave, titulo: mesYAnio(c.fecha), total: 0, consultas: [] };
    grupo.consultas.push(c);
    grupo.total += 1;
    grupos.set(clave, grupo);
  }
  return [...grupos.values()];
}

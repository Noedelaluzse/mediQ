import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import type { EntradaRegistrarConsulta } from '../domain/EntradaDeConsulta';

const CAMPOS_DE_TEXTO = ['lugar', 'consultorio', 'medicoId', 'medicoNombre', 'medicoTelefono', 'medicoCedula', 'motivo', 'notasDelMedico'] as const;

type EntradaGuardada = Omit<EntradaRegistrarConsulta, 'fecha' | 'proximaCita'> & { fecha: string; proximaCita?: string };
type PendienteGuardada = Omit<ConsultaPendiente, 'entrada' | 'creadaEn'> & { entrada: EntradaGuardada; creadaEn: string };

const aFecha = (valor: unknown): Date | undefined => {
  if (typeof valor !== 'string') return undefined;
  const f = new Date(valor);
  return Number.isNaN(f.getTime()) ? undefined : f;
};

/** La cola como texto JSON: las fechas viajan en ISO. */
export function colaATexto(cola: ConsultaPendiente[]): string {
  const guardada: PendienteGuardada[] = cola.map((c) => ({
    ...c,
    entrada: { ...c.entrada, fecha: c.entrada.fecha.toISOString(), proximaCita: c.entrada.proximaCita?.toISOString() },
    creadaEn: c.creadaEn.toISOString(),
  }));
  return JSON.stringify(guardada);
}

function deGuardada(valor: unknown): ConsultaPendiente | null {
  const g = valor as Partial<PendienteGuardada> | null;
  if (!g || typeof g !== 'object' || typeof g.id !== 'string' || typeof g.intentos !== 'number') return null;
  const creadaEn = aFecha(g.creadaEn);
  const e = g.entrada as Partial<EntradaGuardada> | undefined;
  const fecha = aFecha(e?.fecha);
  if (!creadaEn || !e || !fecha || typeof e.especialidad !== 'string') return null;

  const entrada: EntradaRegistrarConsulta = { fecha, especialidad: e.especialidad };
  for (const campo of CAMPOS_DE_TEXTO) if (typeof e[campo] === 'string') entrada[campo] = e[campo];
  if (Array.isArray(e.indicaciones)) entrada.indicaciones = e.indicaciones.filter((i): i is string => typeof i === 'string');
  const proxima = aFecha(e.proximaCita);
  if (proxima) entrada.proximaCita = proxima;
  return { id: g.id, entrada, creadaEn, intentos: g.intentos, ...(typeof g.error === 'string' ? { error: g.error } : {}) };
}

/** Lee la cola; un contenido dañado es una cola vacía y un elemento dañado se descarta (no debe romper la app). */
export function colaDeTexto(texto: string): ConsultaPendiente[] {
  try {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? valor.flatMap((v) => deGuardada(v) ?? []) : [];
  } catch {
    return [];
  }
}

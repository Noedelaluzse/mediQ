import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { horaCorta, mesCortoEnMayusculas } from '@/shared/kernel/fechas';

import type { ProximaCita } from '../domain/ProximaCita';

export interface DatosDeProximaCita {
  mes: string;
  dia: string;
  titulo: string;
  detalle: string;
}

/** Tarjeta verde del Diario (canvas): "OCT 19 · Seguimiento · Cardiología · Dra. Mariana Solís · 10:30". */
export function datosDeProximaCita(c: ProximaCita): DatosDeProximaCita {
  const hora = horaCorta(c.fecha);
  return {
    mes: mesCortoEnMayusculas(c.fecha),
    dia: String(c.fecha.getDate()),
    titulo: `Seguimiento · ${nombreDeEspecialidad(c.especialidad)}`,
    detalle: c.medicoNombre ? `${c.medicoNombre} · ${hora}` : hora,
  };
}

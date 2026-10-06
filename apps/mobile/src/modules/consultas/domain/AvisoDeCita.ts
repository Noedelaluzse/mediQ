import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';
import { horaCorta } from '@/shared/kernel/fechas';

import type { ProximaCita } from './ProximaCita';

/** Todos los avisos de citas llevan este prefijo en su id: así se reconocen para reemplazarlos o cancelarlos. */
export const PREFIJO_DE_AVISOS = 'cita-';

/** Una notificación local programada para una cita (RF-40). */
export interface AvisoDeCita {
  id: string;
  consultaId: string;
  cuando: Date;
  titulo: string;
  cuerpo: string;
}

const HORA_DEL_AVISO_DE_LA_VISPERA = 9;
const DOS_HORAS = 2 * 60 * 60 * 1000;

/**
 * RF-40, decidido con el usuario: un aviso la víspera a las 9:00 y otro 2 horas antes de la cita. Solo se devuelven los que
 * todavía están en el futuro. Los ids son estables por consulta, así reprogramar reemplaza en vez de duplicar.
 * El texto lleva especialidad y médico (el aviso se queda en el teléfono y no se envía a ningún servidor).
 */
export function avisosDeCita(cita: ProximaCita, ahora: Date): AvisoDeCita[] {
  const especialidad = nombreDeEspecialidad(cita.especialidad);
  const hora = horaCorta(cita.fecha);
  const cuerpo = cita.medicoNombre ? `${cita.medicoNombre} · ${hora}` : hora;

  const vispera = new Date(cita.fecha);
  vispera.setDate(vispera.getDate() - 1);
  vispera.setHours(HORA_DEL_AVISO_DE_LA_VISPERA, 0, 0, 0);

  const candidatos: AvisoDeCita[] = [
    { id: `${PREFIJO_DE_AVISOS}${cita.consultaId}-vispera`, consultaId: cita.consultaId, cuando: vispera, titulo: `Cita mañana · ${especialidad}`, cuerpo },
    { id: `${PREFIJO_DE_AVISOS}${cita.consultaId}-2h`, consultaId: cita.consultaId, cuando: new Date(cita.fecha.getTime() - DOS_HORAS), titulo: `Cita en 2 horas · ${especialidad}`, cuerpo },
  ];
  return candidatos.filter((a) => a.cuando.getTime() > ahora.getTime());
}

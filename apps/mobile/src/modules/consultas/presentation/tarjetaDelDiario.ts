import { diaDeLaSemanaCorto } from '@/shared/kernel/fechas';
import { nombreDeEspecialidad } from '@/shared/kernel/especialidades';

import type { ConsultaDelDiario } from '../domain/Diario';

export interface DatosDeTarjeta {
  dia: string;
  diaDeLaSemana: string;
  especialidad: string;
  titulo: string;
  resumen?: string;
}

/** HU-07: con médico, el título es el médico y el resumen las notas (o el motivo); sin médico, el título es el motivo. */
export function datosDeTarjeta(c: ConsultaDelDiario): DatosDeTarjeta {
  const base = {
    dia: String(c.fecha.getDate()).padStart(2, '0'),
    diaDeLaSemana: diaDeLaSemanaCorto(c.fecha),
    especialidad: nombreDeEspecialidad(c.especialidad),
  };
  return c.medicoNombre
    ? { ...base, titulo: c.medicoNombre, resumen: c.notasDelMedico ?? c.motivo }
    : { ...base, titulo: c.motivo ?? 'Consulta', resumen: c.notasDelMedico };
}

export const textoDeTotal = (n: number): string => (n === 1 ? '1 consulta' : `${n} consultas`);

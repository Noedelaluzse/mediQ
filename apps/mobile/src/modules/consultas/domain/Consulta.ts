import { ESPECIALIDADES } from '@/shared/kernel/especialidades';
import { err, ok, type Result } from '@/shared/kernel/Result';

import {
  DemasiadasIndicacionesError,
  EspecialidadDeConsultaInvalidaError,
  FechaFuturaError,
  LugarInvalidoError,
  ProximaCitaInvalidaError,
} from './errors';
import { MAXIMO_DE_INDICACIONES, type Indicacion } from './Indicacion';
import { tipoDeEspecialidad, type TipoDeMedico } from './TipoDeMedico';

/** El perfil propio tiene id fijo `self` (docs/11). Los familiares llegan en la fase 3. */
export const PACIENTE_PROPIO = 'self';
const LARGO_MAXIMO_DE_LUGAR = 80;

export interface Referencia {
  id: string;
  nombre: string;
}

export interface Consulta {
  id: string;
  pacienteId: string;
  modo: 'presencial';
  tipo: TipoDeMedico;
  especialidad: string;
  fecha: Date;
  medico?: Referencia;
  lugar?: Referencia;
  consultorio?: string;
  motivo?: string;
  /** Lo que dijo el médico, en palabras del paciente. */
  notasDelMedico?: string;
  /** La lista marcable (RF-15), en orden. */
  indicaciones: Indicacion[];
  proximaCita?: Date;
}

export interface DatosDeConsulta {
  id: string;
  fecha: Date;
  especialidad: string;
  medico?: Referencia;
  lugar?: Referencia;
  consultorio?: string;
  motivo?: string;
  notasDelMedico?: string;
  indicaciones?: Indicacion[];
  proximaCita?: Date;
}

const opcional = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

type ErrorDeConsulta =
  | FechaFuturaError
  | ProximaCitaInvalidaError
  | EspecialidadDeConsultaInvalidaError
  | LugarInvalidoError
  | DemasiadasIndicacionesError;

/** RF-10 / HU-02: fecha no futura, especialidad del catálogo (de ella se deduce el tipo), próxima cita posterior a la consulta. */
export function crearConsulta(d: DatosDeConsulta, ahora: Date): Result<Consulta, ErrorDeConsulta> {
  if (!ESPECIALIDADES.some((e) => e.slug === d.especialidad)) return err(new EspecialidadDeConsultaInvalidaError(d.especialidad));
  if (d.fecha.getTime() > ahora.getTime()) return err(new FechaFuturaError());
  if (d.proximaCita && d.proximaCita.getTime() <= d.fecha.getTime()) return err(new ProximaCitaInvalidaError());
  if (d.lugar && d.lugar.nombre.length > LARGO_MAXIMO_DE_LUGAR) return err(new LugarInvalidoError());
  if ((d.indicaciones?.length ?? 0) > MAXIMO_DE_INDICACIONES) return err(new DemasiadasIndicacionesError());

  return ok({
    id: d.id,
    pacienteId: PACIENTE_PROPIO,
    modo: 'presencial',
    tipo: tipoDeEspecialidad(d.especialidad),
    especialidad: d.especialidad,
    fecha: d.fecha,
    medico: d.medico,
    lugar: d.lugar,
    consultorio: opcional(d.consultorio),
    motivo: opcional(d.motivo),
    notasDelMedico: opcional(d.notasDelMedico),
    indicaciones: d.indicaciones ?? [],
    proximaCita: d.proximaCita,
  });
}

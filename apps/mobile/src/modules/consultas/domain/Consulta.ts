import { ESPECIALIDADES } from '@/shared/kernel/especialidades';
import { err, ok, type Result } from '@/shared/kernel/Result';

import {
  EspecialidadDeConsultaInvalidaError,
  FechaFuturaError,
  LugarInvalidoError,
  ProximaCitaInvalidaError,
  TipoDeMedicoInvalidoError,
} from './errors';
import { TIPOS_DE_MEDICO, type TipoDeMedico } from './TipoDeMedico';

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
  indicaciones?: string;
  proximaCita?: Date;
}

export interface DatosDeConsulta {
  id: string;
  fecha: Date;
  tipo: string;
  especialidad: string;
  medico?: Referencia;
  lugar?: Referencia;
  consultorio?: string;
  motivo?: string;
  indicaciones?: string;
  proximaCita?: Date;
}

const opcional = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

type ErrorDeConsulta =
  | FechaFuturaError
  | ProximaCitaInvalidaError
  | TipoDeMedicoInvalidoError
  | EspecialidadDeConsultaInvalidaError
  | LugarInvalidoError;

/** RF-10 / HU-02: fecha no futura, tipo y especialidad del catálogo, próxima cita posterior a la consulta. */
export function crearConsulta(d: DatosDeConsulta, ahora: Date): Result<Consulta, ErrorDeConsulta> {
  const tipo = TIPOS_DE_MEDICO.find((t) => t.valor === d.tipo)?.valor;
  if (!tipo) return err(new TipoDeMedicoInvalidoError(d.tipo));
  if (!ESPECIALIDADES.some((e) => e.slug === d.especialidad)) return err(new EspecialidadDeConsultaInvalidaError(d.especialidad));
  if (d.fecha.getTime() > ahora.getTime()) return err(new FechaFuturaError());
  if (d.proximaCita && d.proximaCita.getTime() <= d.fecha.getTime()) return err(new ProximaCitaInvalidaError());
  if (d.lugar && d.lugar.nombre.length > LARGO_MAXIMO_DE_LUGAR) return err(new LugarInvalidoError());

  return ok({
    id: d.id,
    pacienteId: PACIENTE_PROPIO,
    modo: 'presencial',
    tipo,
    especialidad: d.especialidad,
    fecha: d.fecha,
    medico: d.medico,
    lugar: d.lugar,
    consultorio: opcional(d.consultorio),
    motivo: opcional(d.motivo),
    indicaciones: opcional(d.indicaciones),
    proximaCita: d.proximaCita,
  });
}

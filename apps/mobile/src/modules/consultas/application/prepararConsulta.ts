import type { DomainError } from '@/shared/kernel/DomainError';
import { err, ok, type Result } from '@/shared/kernel/Result';

import { crearConsulta, type Consulta, type Referencia } from '../domain/Consulta';
import { DatosDeMedicoIncompletosError } from '../domain/errors';
import type { Indicacion } from '../domain/Indicacion';
import type { LugaresParaConsulta, MedicosParaConsulta } from '../domain/puertos';

export interface EntradaRegistrarConsulta {
  fecha: Date;
  tipo: string;
  especialidad: string;
  lugar?: string;
  consultorio?: string;
  /** Presente solo si el paciente eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre?: string;
  medicoTelefono?: string;
  medicoCedula?: string;
  motivo?: string;
  notasDelMedico?: string;
  /** Textos de las indicaciones, en orden; las vacías se ignoran. */
  indicaciones?: string[];
  proximaCita?: Date;
}

const limpio = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

/**
 * Lo común de registrar y editar una consulta: valida TODO primero (para no dejar médicos ni lugares a medias si la
 * consulta es inválida), luego asegura al médico y al lugar en el directorio y arma la consulta final.
 */
export async function prepararConsulta(
  e: EntradaRegistrarConsulta,
  id: string,
  indicaciones: Indicacion[],
  dependencias: { medicos: MedicosParaConsulta; lugares: LugaresParaConsulta; ahora: () => Date },
): Promise<Result<Consulta, DomainError>> {
  const nombreMedico = limpio(e.medicoNombre);
  const nombreLugar = limpio(e.lugar);
  const telefono = limpio(e.medicoTelefono);
  const cedula = limpio(e.medicoCedula);

  if (!nombreMedico && (telefono || cedula)) return err(new DatosDeMedicoIncompletosError());

  const datos = {
    fecha: e.fecha,
    tipo: e.tipo,
    especialidad: e.especialidad,
    consultorio: e.consultorio,
    motivo: e.motivo,
    notasDelMedico: e.notasDelMedico,
    indicaciones,
    proximaCita: e.proximaCita,
  };

  const previa = crearConsulta(
    {
      ...datos,
      id: 'validacion',
      medico: nombreMedico ? { id: 'pendiente', nombre: nombreMedico } : undefined,
      lugar: nombreLugar ? { id: 'pendiente', nombre: nombreLugar } : undefined,
    },
    dependencias.ahora(),
  );
  if (!previa.ok) return previa;

  let medico: Referencia | undefined;
  if (nombreMedico) {
    const r = await dependencias.medicos.asegurar({ medicoId: e.medicoId, nombre: nombreMedico, especialidad: e.especialidad, telefono, cedula });
    if (!r.ok) return r;
    medico = r.value;
  }

  let lugar: Referencia | undefined;
  if (nombreLugar) {
    const r = await dependencias.lugares.asegurar(nombreLugar);
    if (!r.ok) return r;
    lugar = r.value;
  }

  const consulta = crearConsulta({ ...datos, id, medico, lugar }, dependencias.ahora());
  return consulta.ok ? ok(consulta.value) : err(consulta.error);
}

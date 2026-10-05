import type { DomainError } from '@/shared/kernel/DomainError';
import { err, ok, type Result } from '@/shared/kernel/Result';

import { crearConsulta, type Consulta, type Referencia } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { DatosDeMedicoIncompletosError } from '../domain/errors';
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
  indicaciones?: string;
  proximaCita?: Date;
}

const limpio = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

/** CU-02: valida, guarda al médico y al lugar si son nuevos y persiste la consulta. */
export class RegistrarConsulta {
  constructor(
    private readonly consultas: ConsultaRepository,
    private readonly medicos: MedicosParaConsulta,
    private readonly lugares: LugaresParaConsulta,
    private readonly generarId: () => string,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(e: EntradaRegistrarConsulta): Promise<Result<Consulta, DomainError>> {
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
      indicaciones: e.indicaciones,
      proximaCita: e.proximaCita,
    };

    // Primero se valida todo, para no dejar médicos ni lugares a medias si la consulta es inválida.
    const previa = crearConsulta(
      {
        ...datos,
        id: 'validacion',
        medico: nombreMedico ? { id: 'pendiente', nombre: nombreMedico } : undefined,
        lugar: nombreLugar ? { id: 'pendiente', nombre: nombreLugar } : undefined,
      },
      this.ahora(),
    );
    if (!previa.ok) return previa;

    let medico: Referencia | undefined;
    if (nombreMedico) {
      const r = await this.medicos.asegurar({ medicoId: e.medicoId, nombre: nombreMedico, especialidad: e.especialidad, telefono, cedula });
      if (!r.ok) return r;
      medico = r.value;
    }

    let lugar: Referencia | undefined;
    if (nombreLugar) {
      const r = await this.lugares.asegurar(nombreLugar);
      if (!r.ok) return r;
      lugar = r.value;
    }

    const consulta = crearConsulta({ ...datos, id: this.generarId(), medico, lugar }, this.ahora());
    if (!consulta.ok) return consulta;
    await this.consultas.guardar(consulta.value);
    return ok(consulta.value);
  }
}

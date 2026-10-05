import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { MedicosRepository } from '../domain/MedicosRepository';

/** Lo que "Elegir guardado" rellena en la consulta nueva: nombre, especialidad, teléfono, cédula y lugar habitual. */
export interface DatosDeMedicoParaConsulta {
  medicoId: string;
  nombre: string;
  especialidad: string;
  telefono?: string;
  cedula?: string;
  /** El lugar donde más lo ha visto; el paciente puede cambiarlo. */
  lugar?: string;
}

export class ElegirMedicoGuardado {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(medicoId: string): Promise<DatosDeMedicoParaConsulta | null> {
    const medico = await this.medicos.obtener(medicoId);
    if (!medico) return null;
    const resumen = (await this.consultas.resumenPorMedico()).get(medicoId);
    return {
      medicoId: medico.id,
      nombre: medico.nombreCompleto,
      especialidad: medico.especialidad,
      telefono: medico.telefono,
      cedula: medico.cedula,
      lugar: resumen?.lugares[0],
    };
  }
}

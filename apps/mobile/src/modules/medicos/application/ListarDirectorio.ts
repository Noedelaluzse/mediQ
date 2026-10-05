import { claveDeNombre } from '../domain/ordenarPorNombre';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

export interface MedicoEnDirectorio {
  medico: Medico;
  consultas: number;
  ultimaVisita?: Date;
}

/** RF-21: el directorio por nombre, con número de consultas y última visita de cada médico. */
export class ListarDirectorio {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(): Promise<MedicoEnDirectorio[]> {
    const [lista, resumen] = await Promise.all([this.medicos.listar(), this.consultas.resumenPorMedico()]);
    return lista
      .sort((a, b) => claveDeNombre(a.nombreCompleto).localeCompare(claveDeNombre(b.nombreCompleto), 'es'))
      .map((medico) => ({
        medico,
        consultas: resumen.get(medico.id)?.consultas ?? 0,
        ultimaVisita: resumen.get(medico.id)?.ultimaVisita,
      }));
  }
}

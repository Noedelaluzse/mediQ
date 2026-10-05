import { coincideConBusqueda } from '../domain/busqueda';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { claveDeNombre } from '../domain/ordenarPorNombre';

export interface MedicoParaElegir {
  medico: Medico;
  /** Dónde lo ha atendido, del más frecuente al menos. */
  lugares: string[];
}

/** HU-08: los médicos guardados, filtrados por nombre o especialidad, para elegir uno al registrar una consulta. */
export class BuscarMedicosParaElegir {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(texto: string): Promise<MedicoParaElegir[]> {
    const [lista, resumen] = await Promise.all([this.medicos.listar(), this.consultas.resumenPorMedico()]);
    return lista
      .filter((m) => coincideConBusqueda(m, texto))
      .sort((a, b) => claveDeNombre(a.nombreCompleto).localeCompare(claveDeNombre(b.nombreCompleto), 'es'))
      .map((medico) => ({ medico, lugares: resumen.get(medico.id)?.lugares ?? [] }));
  }
}

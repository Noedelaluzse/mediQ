import type { Consulta } from '../domain/Consulta';
import type { ContactoDeMedico } from '../domain/ContactoDeMedico';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';

export interface DetalleDeConsulta {
  consulta: Consulta;
  /** En orden; son las que se marcan en la pantalla. */
  indicaciones: Indicacion[];
  telefonoDelMedico?: string;
}

/** CU-05: la consulta con sus indicaciones y el teléfono de su médico. */
export class ObtenerDetalleDeConsulta {
  constructor(
    private readonly detalle: DetalleDeConsultaRepository,
    private readonly indicaciones: IndicacionesRepository,
    private readonly contacto: ContactoDeMedico,
  ) {}

  async ejecutar(consultaId: string): Promise<DetalleDeConsulta | null> {
    const consulta = await this.detalle.obtener(consultaId);
    if (!consulta) return null;

    const [lista, telefonoDelMedico] = await Promise.all([
      this.indicaciones.listar(consultaId),
      consulta.medico?.id ? this.contacto.telefonoDe(consulta.medico.id).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    const ordenadas = lista.sort((a, b) => a.orden - b.orden);
    return { consulta: { ...consulta, indicaciones: ordenadas }, indicaciones: ordenadas, telefonoDelMedico };
  }
}

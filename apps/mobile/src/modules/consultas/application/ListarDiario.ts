import { agruparPorMes, type ConsultaDelDiario, type CursorDelDiario, type GrupoDelMes } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';

export interface DiarioCargado {
  /** Todo lo cargado hasta ahora (las anteriores + la página nueva). */
  consultas: ConsultaDelDiario[];
  grupos: GrupoDelMes[];
  hayMas: boolean;
  siguiente?: CursorDelDiario;
}

/** CU-03: carga una página del diario y la suma a lo que ya se mostraba. */
export class ListarDiario {
  constructor(private readonly diario: DiarioRepository) {}

  async ejecutar(previas: ConsultaDelDiario[], cursor?: CursorDelDiario): Promise<DiarioCargado> {
    const pagina = await this.diario.pagina(cursor);
    const consultas = [...previas, ...pagina.consultas];
    return { consultas, grupos: agruparPorMes(consultas), hayMas: pagina.siguiente !== undefined, siguiente: pagina.siguiente };
  }
}

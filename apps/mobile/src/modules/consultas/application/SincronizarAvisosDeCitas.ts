import { avisosDeCita, PREFIJO_DE_AVISOS } from '../domain/AvisoDeCita';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import { esFutura } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';

export type ResultadoDeSincronizar = { estado: 'sin-permiso' } | { estado: 'sincronizados'; cantidad: number };

/**
 * RF-40: deja programados los avisos de las próximas citas de las consultas vigentes. Se llama al abrir el Diario y al guardar
 * una consulta, así una fecha cambiada, movida o eliminada actualiza o cancela sus avisos. Sin permiso no hace nada.
 */
export class SincronizarAvisosDeCitas {
  constructor(
    private readonly citas: ProximaCitaRepository,
    private readonly programador: ProgramadorDeAvisos,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(): Promise<ResultadoDeSincronizar> {
    if (!(await this.programador.permiso()).concedido) return { estado: 'sin-permiso' };
    const ahora = this.ahora();
    const avisos = (await this.citas.posterioresA(ahora)).filter((c) => esFutura(c, ahora)).flatMap((c) => avisosDeCita(c, ahora));
    await this.programador.reemplazar(avisos, PREFIJO_DE_AVISOS);
    return { estado: 'sincronizados', cantidad: avisos.length };
  }
}

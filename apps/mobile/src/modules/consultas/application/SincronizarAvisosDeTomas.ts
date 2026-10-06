import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { avisosDeToma, PREFIJO_DE_TOMAS } from '../domain/Toma';

export type ResultadoDeSincronizarTomas = { estado: 'sin-permiso' } | { estado: 'sincronizados'; cantidad: number };

/**
 * RF-32: deja programados los avisos de toma más próximos (hasta el presupuesto de iOS). Se llama al abrir la app, al volver a ella
 * y al guardar una receta: así se rellenan solos y un tratamiento que terminó deja de avisar. Sin permiso no hace nada.
 */
export class SincronizarAvisosDeTomas {
  constructor(
    private readonly recordatorios: RecordatoriosDeTomaRepository,
    private readonly programador: ProgramadorDeAvisos,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(): Promise<ResultadoDeSincronizarTomas> {
    if (!(await this.programador.permiso()).concedido) return { estado: 'sin-permiso' };
    const avisos = avisosDeToma(await this.recordatorios.listar(), this.ahora());
    await this.programador.reemplazar(avisos, PREFIJO_DE_TOMAS);
    return { estado: 'sincronizados', cantidad: avisos.length };
  }
}

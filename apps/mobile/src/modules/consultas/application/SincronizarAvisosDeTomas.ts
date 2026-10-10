import { inicioDelDia } from '@/shared/kernel/fechas';

import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import { avisosDeTomaConInsistencia, PREFIJO_DE_POSPUESTOS, PREFIJO_DE_TOMAS } from '../domain/Toma';

export type ResultadoDeSincronizarTomas = { estado: 'sin-permiso' } | { estado: 'sincronizados'; cantidad: number };

const DIA_EN_MS = 86_400_000;

/**
 * RF-32: deja programados los avisos de toma más próximos (hasta el presupuesto de iOS), cada uno con su insistencia (F027). Se
 * llama al abrir la app, al volver a ella y al guardar una receta: así se rellenan solos y un tratamiento que terminó deja de
 * avisar. Las dosis ya tomadas y las pospuestas se excluyen, para que reprogramar no resucite una insistencia cancelada. Sin
 * permiso no hace nada.
 */
export class SincronizarAvisosDeTomas {
  constructor(
    private readonly recordatorios: RecordatoriosDeTomaRepository,
    private readonly programador: ProgramadorDeAvisos,
    private readonly registro: RegistroDeTomasRepository,
    private readonly ahora: () => Date,
  ) {}

  private cola: Promise<unknown> = Promise.resolve();

  /** Una a la vez: abrir la app y tocar «Ya la tomé» disparan sincronizaciones casi juntas, y la última debe ver lo registrado. */
  ejecutar(): Promise<ResultadoDeSincronizarTomas> {
    const turno = this.cola.then(() => this.sincronizar());
    this.cola = turno.catch(() => undefined);
    return turno;
  }

  private async sincronizar(): Promise<ResultadoDeSincronizarTomas> {
    if (!(await this.programador.permiso()).concedido) return { estado: 'sin-permiso' };
    const ahora = this.ahora();
    const [lista, tomadas, pospuestas] = await Promise.all([
      // Lo mismo que pide la tarjeta «Hoy» (los vigentes desde el inicio de hoy): así las dos comparten una sola lectura (F070).
      this.recordatorios.listarActivos(inicioDelDia(ahora)),
      this.registro.tomadasDesde(new Date(ahora.getTime() - DIA_EN_MS)),
      this.programador.idsPendientes(PREFIJO_DE_POSPUESTOS),
    ]);
    const avisos = avisosDeTomaConInsistencia(lista, ahora, {
      tomadas: new Set(tomadas.map((t) => t.tomaId)),
      pospuestas: new Set(pospuestas.map((id) => id.slice(PREFIJO_DE_POSPUESTOS.length))),
    });
    await this.programador.reemplazar(avisos, PREFIJO_DE_TOMAS);
    return { estado: 'sincronizados', cantidad: avisos.length };
  }
}

import { describe, expect, it } from 'vitest';

import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import type { RecordatorioDeToma } from '../domain/Toma';
import { ObtenerTomasDeHoy } from './ObtenerTomasDeHoy';
import { SincronizarAvisosDeTomas } from './SincronizarAvisosDeTomas';

/**
 * F070 (AUD-10): la tarjeta «Hoy» y los avisos de toma pedían TODOS los recordatorios (también los de tratamientos que terminaron hace meses) y los
 * filtraban en el teléfono. Ahora piden solo los vigentes: los que no terminaron antes de HOY (uno que terminó hoy a las 14:00 sigue contando para
 * las dosis de esta mañana).
 */
const ahora = new Date(2026, 9, 9, 15, 30);
const inicioDeHoy = new Date(2026, 9, 9);
const rec = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId: 'c1',
  medicamentoId: 'mA',
  indice: 0,
  medicamento: 'Losartán',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde: new Date(2026, 9, 5, 7, 0),
  hasta: new Date(2026, 9, 9, 14, 0), // terminó HOY a las 14:00
  ...extra,
});

const montar = () => {
  const pedidos: { metodo: string; desde?: Date }[] = [];
  const repo: RecordatoriosDeTomaRepository = {
    listar: async () => (pedidos.push({ metodo: 'listar' }), [rec()]),
    listarActivos: async (desde) => (pedidos.push({ metodo: 'listarActivos', desde }), [rec()]),
    reemplazarDe: async () => undefined,
    quitarDe: async () => undefined,
  };
  const registro: RegistroDeTomasRepository = { registrar: async () => undefined, tomadasDesde: async () => [], deshacer: async () => undefined, quitarDeMedicamento: async () => undefined };
  const programador: ProgramadorDeAvisos = {
    permiso: async () => ({ concedido: true, puedePreguntar: true }),
    pedirPermiso: async () => ({ concedido: true, puedePreguntar: true }),
    reemplazar: async () => undefined,
    programar: async () => undefined,
    cancelar: async () => undefined,
    idsPendientes: async () => [],
    cancelarTodos: async () => undefined,
  };
  return { pedidos, repo, registro, programador };
};

describe('la tarjeta «Hoy» (ObtenerTomasDeHoy)', () => {
  it('pide solo los recordatorios vigentes desde el inicio de hoy, no todos', async () => {
    const { pedidos, repo, registro } = montar();
    await new ObtenerTomasDeHoy(repo, registro, () => ahora).ejecutar();
    expect(pedidos).toEqual([{ metodo: 'listarActivos', desde: inicioDeHoy }]);
  });

  it('un tratamiento que terminó hoy a las 14:00 sigue mostrando las dosis de esta mañana', async () => {
    const { repo, registro } = montar();
    const { tomas } = await new ObtenerTomasDeHoy(repo, registro, () => ahora).ejecutar();
    expect(tomas.map((t) => t.toma.programadaPara.getHours())).toEqual([0, 8]); // 00:00 y 08:00; la de las 16:00 ya no entra en el tratamiento
  });
});

describe('los avisos de toma (SincronizarAvisosDeTomas)', () => {
  it('piden lo mismo que la tarjeta «Hoy» (el mismo inicio de día), para poder compartir una sola lectura', async () => {
    const { pedidos, repo, registro, programador } = montar();
    await new SincronizarAvisosDeTomas(repo, programador, registro, () => ahora).ejecutar();
    expect(pedidos).toEqual([{ metodo: 'listarActivos', desde: inicioDeHoy }]);
  });
});

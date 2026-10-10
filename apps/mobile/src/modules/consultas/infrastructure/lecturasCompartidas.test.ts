import { describe, expect, it } from 'vitest';

import { LecturaCompartida } from '@/shared/kernel/lecturaCompartida';

import type { ProximaCita } from '../domain/ProximaCita';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import type { RecordatorioDeToma } from '../domain/Toma';
import { ProximaCitaCompartida, RecordatoriosCompartidos, RegistroDeTomasCompartido } from './lecturasCompartidas';

/**
 * F070 (AUD-10): al abrir el Diario, la tarjeta «Hoy» y los avisos de toma leían los mismos recordatorios y las mismas dosis marcadas; la tarjeta
 * «Próxima cita» y los avisos de citas, las mismas citas. Estos envoltorios hacen UNA lectura y la reparten.
 */
const HORA = 3_600_000;
const rec = (n: number): RecordatorioDeToma => ({ consultaId: `c${n}`, medicamentoId: `m${n}`, indice: 0, medicamento: `M${n}`, frecuencia: 'Cada 8 horas', primeraToma: '08:00', desde: new Date(2026, 9, 1), hasta: new Date(2026, 9, 20) });
const montarLectura = () => {
  let version = 1;
  let ahora = 1_000_000;
  return { crear: <T>() => new LecturaCompartida<T>(() => ahora, 60_000, () => version), escribir: () => version++, avanzar: (ms: number) => (ahora += ms), reloj: () => ahora };
};

describe('RecordatoriosCompartidos', () => {
  const montar = () => {
    const l = montarLectura();
    const llamadas: Date[] = [];
    const real: RecordatoriosDeTomaRepository = {
      listar: async () => [rec(1), rec(2)],
      listarActivos: async (desde) => (llamadas.push(desde), [rec(1)]),
      reemplazarDe: async () => undefined,
      quitarDe: async () => undefined,
    };
    return { l, llamadas, repo: new RecordatoriosCompartidos(real, l.crear()) };
  };
  const inicio = new Date(2026, 9, 9);

  it('dos lecturas de lo vigente (tarjeta «Hoy» y avisos) hacen una sola lectura real', async () => {
    const { repo, llamadas } = montar();
    const [a, b] = await Promise.all([repo.listarActivos(inicio), repo.listarActivos(inicio)]);
    expect(a).toEqual(b);
    expect(llamadas).toHaveLength(1);
  });

  it('al día siguiente (otro inicio de día) lee de nuevo', async () => {
    const { repo, llamadas } = montar();
    await repo.listarActivos(inicio);
    await repo.listarActivos(new Date(2026, 9, 10));
    expect(llamadas).toHaveLength(2);
  });

  it('si algo cambió en la app (cambió la versión de datos) lee de nuevo', async () => {
    const { repo, llamadas, l } = montar();
    await repo.listarActivos(inicio);
    l.escribir();
    await repo.listarActivos(inicio);
    expect(llamadas).toHaveLength(2);
  });

  it('guardar o quitar recordatorios descarta lo compartido (la siguiente lectura ve lo nuevo)', async () => {
    const { repo, llamadas } = montar();
    await repo.listarActivos(inicio);
    await repo.reemplazarDe('c1', []);
    await repo.listarActivos(inicio);
    await repo.quitarDe('c1');
    await repo.listarActivos(inicio);
    expect(llamadas).toHaveLength(3);
  });

  it('cambiar el resultado recibido no afecta a quien lo recibe después (cada uno recibe su copia)', async () => {
    const { repo } = montar();
    const primero = await repo.listarActivos(inicio);
    primero.length = 0;
    expect(await repo.listarActivos(inicio)).toHaveLength(1);
  });

  it('`listar` (todos) pasa directo, sin compartir', async () => {
    const { repo } = montar();
    expect(await repo.listar()).toHaveLength(2);
  });
});

describe('RegistroDeTomasCompartido', () => {
  const toma = (id: string, horasAtras: number, ahora: number): { tomaId: string; tomadaEn: Date } => ({ tomaId: id, tomadaEn: new Date(ahora - horasAtras * HORA) });
  const montar = () => {
    const l = montarLectura();
    const pedidas: Date[] = [];
    const guardadas: TomaRegistrada[] = [];
    const real: RegistroDeTomasRepository = {
      registrar: async (t) => void guardadas.push(t),
      tomadasDesde: async (f) => (pedidas.push(f), [toma('reciente', 2, l.reloj()), toma('de-ayer', 30, l.reloj())].filter((t) => t.tomadaEn >= f)),
      deshacer: async () => undefined,
      quitarDeMedicamento: async () => undefined,
    };
    return { l, pedidas, guardadas, repo: new RegistroDeTomasCompartido(real, l.reloj, l.crear()) };
  };

  it('la lectura de 36 horas y la de 24 horas (tarjeta «Hoy» y avisos) comparten UNA lectura real y cada una recibe solo lo suyo', async () => {
    const { repo, pedidas, l } = montar();
    const [de36, de24] = await Promise.all([repo.tomadasDesde(new Date(l.reloj() - 36 * HORA)), repo.tomadasDesde(new Date(l.reloj() - 24 * HORA))]);
    expect(de36.map((t) => t.tomaId)).toEqual(['reciente', 'de-ayer']);
    expect(de24.map((t) => t.tomaId)).toEqual(['reciente']);
    expect(pedidas).toHaveLength(1);
  });

  it('una petición de 36 horas calculada con OTRO reloj (unos milisegundos antes) también comparte la lectura: los relojes no coinciden al milisegundo', async () => {
    const { repo, pedidas, l } = montar();
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    l.avanzar(4); // el reloj de la copia compartida va unos milisegundos adelante del de quien pregunta
    const de36 = await repo.tomadasDesde(new Date(l.reloj() - 4 - 36 * HORA));
    expect(de36.map((t) => t.tomaId)).toEqual(['reciente', 'de-ayer']);
    expect(pedidas).toHaveLength(1);
  });

  it('marcar o deshacer una dosis descarta lo compartido: la siguiente lectura ve el cambio', async () => {
    const { repo, pedidas, l } = montar();
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    await repo.registrar({ tomaId: 'x', consultaId: 'c1', indice: 0, medicamento: 'A', programadaPara: new Date(), tomadaEn: new Date() });
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    await repo.deshacer('x');
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    expect(pedidas).toHaveLength(3);
  });

  it('una ventana MÁS ANTIGUA que la compartida no se sirve de la copia: se lee aparte', async () => {
    const { repo, pedidas, l } = montar();
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    await repo.tomadasDesde(new Date(l.reloj() - 72 * HORA));
    expect(pedidas).toHaveLength(2);
    expect(pedidas[1].getTime()).toBe(l.reloj() - 72 * HORA);
  });

  it('el borrado de las marcas de un medicamento que sale de la receta también descarta lo compartido', async () => {
    const { repo, pedidas, l } = montar();
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    await repo.quitarDeMedicamento('c1', 'm1');
    await repo.tomadasDesde(new Date(l.reloj() - 24 * HORA));
    expect(pedidas).toHaveLength(2);
  });
});

describe('ProximaCitaCompartida', () => {
  it('la tarjeta «Próxima cita» y los avisos de citas comparten UNA lectura real', async () => {
    const l = montarLectura();
    let lecturas = 0;
    const cita: ProximaCita = { consultaId: 'c1', fecha: new Date(2026, 10, 1), especialidad: 'cardiologia' };
    const repo = new ProximaCitaCompartida({ posterioresA: async () => (lecturas++, [cita]) }, l.crear());
    const [a, b] = await Promise.all([repo.posterioresA(new Date()), repo.posterioresA(new Date(Date.now() + 5))]);
    expect(a).toEqual([cita]);
    expect(b).toEqual([cita]);
    expect(lecturas).toBe(1);
  });

  it('si algo cambió en la app (p. ej. se guardó o eliminó una consulta) lee de nuevo', async () => {
    const l = montarLectura();
    let lecturas = 0;
    const repo = new ProximaCitaCompartida({ posterioresA: async () => (lecturas++, []) }, l.crear());
    await repo.posterioresA(new Date());
    l.escribir();
    await repo.posterioresA(new Date());
    expect(lecturas).toBe(2);
  });
});

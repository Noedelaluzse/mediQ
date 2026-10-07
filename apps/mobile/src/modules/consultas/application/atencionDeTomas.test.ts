import { describe, expect, it } from 'vitest';

import type { AvisoLocal } from '../domain/AvisoLocal';
import type { EstadoDelPermiso, ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { avisosDeToma, idDeInsistencia, idDePospuesto, PREFIJO_DE_POSPUESTOS, PREFIJO_DE_TOMAS, type DatosDeToma, type RecordatorioDeToma } from '../domain/Toma';
import { CancelarInsistenciaDeToma } from './CancelarInsistenciaDeToma';
import { PosponerToma } from './PosponerToma';
import { DeshacerToma } from './DeshacerToma';
import { ObtenerTomasDeHoy } from './ObtenerTomasDeHoy';
import { RegistrarToma } from './RegistrarToma';
import { SincronizarAvisosDeTomas } from './SincronizarAvisosDeTomas';

class Programador implements ProgramadorDeAvisos {
  pendientes = new Map<string, AvisoLocal>();
  porPrefijo = new Map<string, AvisoLocal[]>();
  async permiso(): Promise<EstadoDelPermiso> {
    return { concedido: true, puedePreguntar: true };
  }
  async pedirPermiso() {
    return this.permiso();
  }
  async reemplazar(avisos: AvisoLocal[], prefijo: string) {
    for (const id of [...this.pendientes.keys()]) if (id.startsWith(prefijo)) this.pendientes.delete(id);
    for (const a of avisos) this.pendientes.set(a.id, a);
    this.porPrefijo.set(prefijo, avisos);
  }
  async programar(aviso: AvisoLocal) {
    this.pendientes.set(aviso.id, aviso);
  }
  async cancelar(ids: string[]) {
    for (const id of ids) this.pendientes.delete(id);
  }
  async idsPendientes(prefijo: string) {
    return [...this.pendientes.keys()].filter((id) => id.startsWith(prefijo));
  }
  async cancelarTodos() {
    this.pendientes.clear();
  }
}

class Registro implements RegistroDeTomasRepository {
  tomas = new Map<string, TomaRegistrada>();
  falla = false;
  async registrar(t: TomaRegistrada) {
    if (this.falla) throw new Error('sin red');
    this.tomas.set(t.tomaId, t);
  }
  async tomadasDesde(fecha: Date) {
    return [...this.tomas.values()].filter((t) => t.tomadaEn.getTime() >= fecha.getTime()).map((t) => ({ tomaId: t.tomaId, tomadaEn: t.tomadaEn }));
  }
  async deshacer(tomaId: string) {
    this.tomas.delete(tomaId);
  }
}

class Recordatorios implements RecordatoriosDeTomaRepository {
  constructor(private readonly lista: RecordatorioDeToma[]) {}
  async listar() {
    return this.lista;
  }
  async reemplazarDe() {}
  async quitarDe() {}
}

const recordatorio: RecordatorioDeToma = {
  consultaId: 'c1',
  indice: 0,
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde: new Date(2026, 9, 6, 7, 0),
  hasta: new Date(2026, 9, 9, 7, 0),
};
const ahora = new Date(2026, 9, 6, 8, 2);
const [aviso] = avisosDeToma([recordatorio], new Date(2026, 9, 6, 6, 0));
const toma = aviso.toma as DatosDeToma;

describe('RegistrarToma («Ya la tomé»)', () => {
  it('guarda la dosis como tomada, con la hora programada y la hora real', async () => {
    const registro = new Registro();
    await new RegistrarToma(registro, new Programador(), () => ahora).ejecutar(toma, 'c1');
    expect(registro.tomas.get(toma.tomaId)).toEqual({
      tomaId: toma.tomaId,
      consultaId: 'c1',
      indice: 0,
      medicamento: 'Losartán',
      dosis: '1 tableta',
      programadaPara: toma.programadaPara,
      tomadaEn: ahora,
    });
  });

  it('cancela la insistencia y el aviso pospuesto de esa dosis', async () => {
    const programador = new Programador();
    await programador.programar({ ...aviso, id: idDeInsistencia(toma.tomaId) });
    await programador.programar({ ...aviso, id: idDePospuesto(toma.tomaId) });
    await new RegistrarToma(new Registro(), programador, () => ahora).ejecutar(toma, 'c1');
    expect(programador.pendientes.size).toBe(0);
  });

  it('cancela los avisos aunque guardar falle (ya no hay que insistirle) y avisa del error', async () => {
    const programador = new Programador();
    await programador.programar({ ...aviso, id: idDeInsistencia(toma.tomaId) });
    const registro = new Registro();
    registro.falla = true;
    await expect(new RegistrarToma(registro, programador, () => ahora).ejecutar(toma, 'c1')).rejects.toThrow('sin red');
    expect(programador.pendientes.size).toBe(0);
  });
});

describe('PosponerToma («Recordar en 5 min»)', () => {
  it('cancela la insistencia original y programa un aviso nuevo 5 minutos después del toque', async () => {
    const programador = new Programador();
    await programador.programar({ ...aviso, id: idDeInsistencia(toma.tomaId) });
    await new PosponerToma(programador, () => ahora).ejecutar(toma, 'c1');
    expect([...programador.pendientes.keys()]).toEqual([idDePospuesto(toma.tomaId)]);
    expect(programador.pendientes.get(idDePospuesto(toma.tomaId))?.cuando).toEqual(new Date(2026, 9, 6, 8, 7));
  });

  it('posponer dos veces deja un solo aviso (el último)', async () => {
    const programador = new Programador();
    await new PosponerToma(programador, () => ahora).ejecutar(toma, 'c1');
    await new PosponerToma(programador, () => new Date(2026, 9, 6, 8, 10)).ejecutar(toma, 'c1');
    expect(programador.pendientes.size).toBe(1);
    expect(programador.pendientes.get(idDePospuesto(toma.tomaId))?.cuando).toEqual(new Date(2026, 9, 6, 8, 15));
  });
});

describe('CancelarInsistenciaDeToma (abrir el aviso sin tocar un botón)', () => {
  it('quita la insistencia de esa dosis pero no registra nada', async () => {
    const programador = new Programador();
    await programador.programar({ ...aviso, id: idDeInsistencia(toma.tomaId) });
    await new CancelarInsistenciaDeToma(programador).ejecutar(toma);
    expect(programador.pendientes.size).toBe(0);
  });
});

describe('SincronizarAvisosDeTomas con insistencia', () => {
  const sincronizar = (programador: Programador, registro: Registro, hora = ahora) => new SincronizarAvisosDeTomas(new Recordatorios([recordatorio]), programador, registro, () => hora).ejecutar();

  it('programa cada toma con su insistencia', async () => {
    const programador = new Programador();
    await sincronizar(programador, new Registro(), new Date(2026, 9, 6, 6, 0));
    const ids = [...programador.pendientes.keys()];
    expect(ids).toContain(toma.tomaId);
    expect(ids).toContain(idDeInsistencia(toma.tomaId));
  });

  it('al reabrir la app tras tocar «Ya la tomé», la insistencia de esa dosis NO vuelve a programarse', async () => {
    const programador = new Programador();
    const registro = new Registro();
    await new RegistrarToma(registro, programador, () => ahora).ejecutar(toma, 'c1');
    await sincronizar(programador, registro, new Date(2026, 9, 6, 8, 3));
    expect([...programador.pendientes.keys()].some((id) => id.includes(toma.tomaId))).toBe(false);
  });

  it('al reabrir la app tras posponer, no se duplica: queda solo el aviso pospuesto', async () => {
    const programador = new Programador();
    await new PosponerToma(programador, () => new Date(2026, 9, 6, 7, 58)).ejecutar(toma, 'c1');
    await sincronizar(programador, new Registro(), new Date(2026, 9, 6, 7, 59));
    const deEsaDosis = [...programador.pendientes.keys()].filter((id) => id.includes(toma.tomaId));
    expect(deEsaDosis.sort()).toEqual([toma.tomaId, idDePospuesto(toma.tomaId)].sort());
    expect(PREFIJO_DE_POSPUESTOS.startsWith(PREFIJO_DE_TOMAS)).toBe(false);
  });

  it('dos sincronizaciones a la vez no se pisan: la segunda ve lo que registró el toque del botón', async () => {
    const programador = new Programador();
    const original = programador.reemplazar.bind(programador);
    let enCurso = 0;
    let seSolaparon = false;
    programador.reemplazar = async (avisos, prefijo) => {
      enCurso++;
      if (enCurso > 1) seSolaparon = true;
      await new Promise((r) => setTimeout(r, 5));
      await original(avisos, prefijo);
      enCurso--;
    };
    const registro = new Registro();
    const sincronizador = new SincronizarAvisosDeTomas(new Recordatorios([recordatorio]), programador, registro, () => new Date(2026, 9, 6, 8, 3));
    const primera = sincronizador.ejecutar();
    await new RegistrarToma(registro, programador, () => ahora).ejecutar(toma, 'c1');
    await Promise.all([primera, sincronizador.ejecutar()]);
    expect(seSolaparon).toBe(false);
    expect([...programador.pendientes.keys()].some((id) => id.includes(toma.tomaId))).toBe(false);
  });
});

describe('marcar una toma desde la tarjeta «Hoy» (F029)', () => {
  it('marcarla ANTES de su hora cancela su propio aviso, no solo la insistencia', async () => {
    const programador = new Programador();
    await programador.programar(aviso);
    await programador.programar({ ...aviso, id: idDeInsistencia(toma.tomaId) });
    await new RegistrarToma(new Registro(), programador, () => new Date(2026, 9, 6, 7, 30)).ejecutar(toma, 'c1');
    expect(programador.pendientes.size).toBe(0);
  });

  it('al reabrir la app después de marcarla antes de la hora, el aviso no se reprograma', async () => {
    const programador = new Programador();
    const registro = new Registro();
    const hora = new Date(2026, 9, 6, 7, 30);
    const sincronizador = new SincronizarAvisosDeTomas(new Recordatorios([recordatorio]), programador, registro, () => hora);
    await sincronizador.ejecutar();
    expect(programador.pendientes.has(toma.tomaId)).toBe(true);
    await new RegistrarToma(registro, programador, () => hora).ejecutar(toma, 'c1');
    await sincronizador.ejecutar();
    expect([...programador.pendientes.keys()].some((id) => id.includes(toma.tomaId))).toBe(false);
  });
});

describe('DeshacerToma', () => {
  it('borra el registro y, al reprogramar, el aviso futuro vuelve', async () => {
    const programador = new Programador();
    const registro = new Registro();
    const hora = new Date(2026, 9, 6, 7, 30);
    await new RegistrarToma(registro, programador, () => hora).ejecutar(toma, 'c1');
    const sincronizador = new SincronizarAvisosDeTomas(new Recordatorios([recordatorio]), programador, registro, () => hora);
    await sincronizador.ejecutar();
    expect(programador.pendientes.has(toma.tomaId)).toBe(false);

    await new DeshacerToma(registro).ejecutar(toma.tomaId);
    expect(registro.tomas.size).toBe(0);
    await sincronizador.ejecutar();
    expect(programador.pendientes.has(toma.tomaId)).toBe(true);
    expect(programador.pendientes.has(idDeInsistencia(toma.tomaId))).toBe(true);
  });

  it('deshacer una dosis que no estaba registrada no falla', async () => {
    await expect(new DeshacerToma(new Registro()).ejecutar('toma-x')).resolves.toBeUndefined();
  });
});

describe('ObtenerTomasDeHoy', () => {
  const hoy = new Date(2026, 9, 7, 10, 0);

  it('junta los recordatorios con lo registrado y calcula el estado de cada toma', async () => {
    const registro = new Registro();
    const [, ocho] = (await new ObtenerTomasDeHoy(new Recordatorios([recordatorio]), registro, () => hoy).ejecutar()).tomas;
    await registro.registrar({ tomaId: ocho.tomaId, consultaId: 'c1', indice: 0, medicamento: 'Losartán', programadaPara: ocho.toma.programadaPara, tomadaEn: new Date(2026, 9, 7, 8, 2) });
    const { tomas } = await new ObtenerTomasDeHoy(new Recordatorios([recordatorio]), registro, () => hoy).ejecutar();
    expect(tomas.map((t) => t.estado)).toEqual(['atrasada', 'tomada', 'pendiente']);
    expect(tomas[1].tomadaEn).toEqual(new Date(2026, 9, 7, 8, 2));
  });

  it('sin recordatorios no hay tomas', async () => {
    expect((await new ObtenerTomasDeHoy(new Recordatorios([]), new Registro(), () => hoy).ejecutar()).tomas).toEqual([]);
  });
});

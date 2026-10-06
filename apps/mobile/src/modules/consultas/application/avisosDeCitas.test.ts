import { describe, expect, it } from 'vitest';

import { PREFIJO_DE_AVISOS, type AvisoDeCita } from '../domain/AvisoDeCita';
import type { ProgramadorDeAvisos } from '../domain/ProgramadorDeAvisos';
import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import { SincronizarAvisosDeCitas } from './SincronizarAvisosDeCitas';
import { SolicitarPermisoDeAvisos } from './SolicitarPermisoDeAvisos';

class Programador implements ProgramadorDeAvisos {
  programados = new Map<string, AvisoDeCita>();
  llamadasAReemplazar = 0;
  constructor(
    public concedido: boolean,
    public puedePreguntar = true,
    private readonly alPedir: boolean = true,
  ) {}
  async permiso() {
    return { concedido: this.concedido, puedePreguntar: this.puedePreguntar };
  }
  async pedirPermiso() {
    this.concedido = this.alPedir;
    this.puedePreguntar = false;
    return { concedido: this.concedido, puedePreguntar: this.puedePreguntar };
  }
  async reemplazar(avisos: AvisoDeCita[], _prefijo: string) {
    this.llamadasAReemplazar++;
    this.programados = new Map(avisos.map((a) => [a.id, a]));
  }
  async programar() {}
  async cancelar() {}
  async idsPendientes() {
    return [];
  }
  async cancelarTodos() {
    this.programados.clear();
  }
}

const cita = (id: string, fecha: Date): ProximaCita => ({ consultaId: id, fecha, especialidad: 'cardiologia', medicoNombre: 'Dra. Solís' });
const repo = (citas: ProximaCita[]): ProximaCitaRepository => ({ posterioresA: async () => citas });
const ahora = () => new Date(2026, 9, 6, 12, 0);

describe('SincronizarAvisosDeCitas', () => {
  it('con permiso, programa los dos avisos de cada cita futura', async () => {
    const p = new Programador(true);
    const r = await new SincronizarAvisosDeCitas(repo([cita('a', new Date(2026, 9, 19, 13, 0)), cita('b', new Date(2026, 10, 2, 9, 0))]), p, ahora).ejecutar();
    expect(r).toEqual({ estado: 'sincronizados', cantidad: 4 });
    expect([...p.programados.keys()].sort()).toEqual([`${PREFIJO_DE_AVISOS}a-2h`, `${PREFIJO_DE_AVISOS}a-vispera`, `${PREFIJO_DE_AVISOS}b-2h`, `${PREFIJO_DE_AVISOS}b-vispera`]);
  });

  it('sin permiso no programa nada y lo informa', async () => {
    const p = new Programador(false);
    const r = await new SincronizarAvisosDeCitas(repo([cita('a', new Date(2026, 9, 19, 13, 0))]), p, ahora).ejecutar();
    expect(r).toEqual({ estado: 'sin-permiso' });
    expect(p.llamadasAReemplazar).toBe(0);
  });

  it('reemplaza lo anterior: una cita movida o eliminada deja de avisar en la fecha vieja', async () => {
    const p = new Programador(true);
    await new SincronizarAvisosDeCitas(repo([cita('a', new Date(2026, 9, 19, 13, 0)), cita('b', new Date(2026, 10, 2, 9, 0))]), p, ahora).ejecutar();
    await new SincronizarAvisosDeCitas(repo([cita('a', new Date(2026, 9, 21, 16, 0))]), p, ahora).ejecutar();
    expect(p.programados.get(`${PREFIJO_DE_AVISOS}a-2h`)?.cuando).toEqual(new Date(2026, 9, 21, 14, 0));
    expect([...p.programados.keys()].some((k) => k.includes('-b-') || k.includes('b-'))).toBe(false);
    expect(p.programados.size).toBe(2);
  });

  it('sin citas futuras deja la lista de avisos vacía (cancela los viejos)', async () => {
    const p = new Programador(true);
    await new SincronizarAvisosDeCitas(repo([cita('a', new Date(2026, 9, 19, 13, 0))]), p, ahora).ejecutar();
    const r = await new SincronizarAvisosDeCitas(repo([]), p, ahora).ejecutar();
    expect(r).toEqual({ estado: 'sincronizados', cantidad: 0 });
    expect(p.programados.size).toBe(0);
  });

  it('ignora citas ya pasadas y avisos que ya pasaron', async () => {
    const p = new Programador(true);
    const r = await new SincronizarAvisosDeCitas(repo([cita('vieja', new Date(2026, 9, 1)), cita('pronto', new Date(2026, 9, 6, 13, 0))]), p, ahora).ejecutar();
    expect(r).toEqual({ estado: 'sincronizados', cantidad: 0 });
  });
});

describe('SolicitarPermisoDeAvisos', () => {
  it('si ya hay permiso no vuelve a preguntar', async () => {
    expect(await new SolicitarPermisoDeAvisos(new Programador(true)).ejecutar()).toBe('concedido');
  });

  it('si se puede preguntar, pide el permiso y devuelve lo que contestó el usuario', async () => {
    expect(await new SolicitarPermisoDeAvisos(new Programador(false, true, true)).ejecutar()).toBe('concedido');
    expect(await new SolicitarPermisoDeAvisos(new Programador(false, true, false)).ejecutar()).toBe('denegado');
  });

  it('si el sistema ya no deja preguntar (lo negó antes), avisa que hay que activarlo en Ajustes', async () => {
    expect(await new SolicitarPermisoDeAvisos(new Programador(false, false)).ejecutar()).toBe('bloqueado');
  });
});

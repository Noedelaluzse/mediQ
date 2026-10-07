import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { ErrorDeRed } from '@/shared/kernel/red';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';
import { DiarioConCopiaLocal } from './DiarioConCopiaLocal';

class Copia implements CopiaLocal {
  datos = new Map<string, string>();
  async guardar(clave: string, contenido: string) {
    this.datos.set(clave, contenido);
  }
  async leer(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  async limpiar() {
    this.datos.clear();
  }
}
const red = (conectado: boolean): Conectividad => ({ estaConectado: async () => conectado, suscribir: () => () => undefined });

const consulta = (id: string): ConsultaDelDiario => ({ id, fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'cardiologia', tipo: 'especialista', medicoNombre: 'Dra. Solís', lugar: 'Clínica', motivo: 'Revisión', notasDelMedico: 'Bajar la sal' });
const cursor = { __cursorDelDiario: true } as CursorDelDiario;

class Real implements DiarioRepository {
  llamadas: (CursorDelDiario | undefined)[] = [];
  falla: unknown = null;
  constructor(private pagina1: PaginaDelDiario = { consultas: [consulta('a'), consulta('b')], siguiente: cursor }) {}
  async pagina(c?: CursorDelDiario) {
    this.llamadas.push(c);
    if (this.falla) throw this.falla;
    return c ? { consultas: [consulta('c')] } : this.pagina1;
  }
}

describe('DiarioConCopiaLocal (RNF-11: el diario ya visto se lee sin internet)', () => {
  it('con internet devuelve la página real y guarda la primera como copia', async () => {
    const copia = new Copia();
    const d = new DiarioConCopiaLocal(new Real(), copia, red(true));
    const p = await d.pagina();
    expect(p.consultas.map((c) => c.id)).toEqual(['a', 'b']);
    expect(p.siguiente).toBe(cursor);
    expect(copia.datos.has('diario')).toBe(true);
  });

  it('las páginas siguientes (con cursor) pasan directo y no se guardan', async () => {
    const copia = new Copia();
    const real = new Real();
    const d = new DiarioConCopiaLocal(real, copia, red(true));
    await d.pagina();
    copia.datos.clear();
    const p2 = await d.pagina(cursor);
    expect(p2.consultas.map((c) => c.id)).toEqual(['c']);
    expect(copia.datos.size).toBe(0);
  });

  it('sin internet devuelve la copia: con fechas de verdad, sin «ver más» y sin llamar al servidor', async () => {
    const copia = new Copia();
    await new DiarioConCopiaLocal(new Real(), copia, red(true)).pagina();
    const real = new Real();
    const p = await new DiarioConCopiaLocal(real, copia, red(false)).pagina();
    expect(real.llamadas).toEqual([]);
    expect(p.siguiente).toBeUndefined();
    expect(p.consultas).toEqual([consulta('a'), consulta('b')]);
    expect(p.consultas[0].fecha).toBeInstanceOf(Date);
  });

  it('si el servidor falla por red, también devuelve la copia', async () => {
    const copia = new Copia();
    await new DiarioConCopiaLocal(new Real(), copia, red(true)).pagina();
    const real = new Real();
    real.falla = new ErrorDeRed();
    expect((await new DiarioConCopiaLocal(real, copia, red(true)).pagina()).consultas).toHaveLength(2);
  });

  it('sin internet y sin copia falla (el Diario muestra su error con «Reintentar»)', async () => {
    await expect(new DiarioConCopiaLocal(new Real(), new Copia(), red(false)).pagina()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('pedir más páginas sin internet falla (no hay copia de ellas)', async () => {
    const real = new Real();
    real.falla = new ErrorDeRed();
    await expect(new DiarioConCopiaLocal(real, new Copia(), red(false)).pagina(cursor)).rejects.toBeDefined();
  });

  it('una consulta sin médico ni lugar ni notas se copia y se lee igual', async () => {
    const copia = new Copia();
    const minima: ConsultaDelDiario = { id: 'm', fecha: new Date(2026, 8, 1, 8, 0), especialidad: 'medicina-general', tipo: 'general' };
    await new DiarioConCopiaLocal(new Real({ consultas: [minima] }), copia, red(true)).pagina();
    expect((await new DiarioConCopiaLocal(new Real(), copia, red(false)).pagina()).consultas).toEqual([minima]);
  });
});

import { describe, expect, it } from 'vitest';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';
import { ListarDiario } from './ListarDiario';

const c = (id: string, dia: number): ConsultaDelDiario => ({ id, fecha: new Date(2026, 8, dia), especialidad: 'otra', tipo: 'otro' });

class Repo implements DiarioRepository {
  llamadas: (CursorDelDiario | undefined)[] = [];
  constructor(private readonly paginas: PaginaDelDiario[]) {}
  async pagina(cursor?: CursorDelDiario) {
    this.llamadas.push(cursor);
    return this.paginas[this.llamadas.length - 1] ?? { consultas: [] };
  }
}

describe('ListarDiario (CU-03)', () => {
  it('devuelve la primera página con sus grupos por mes', async () => {
    const repo = new Repo([{ consultas: [c('a', 28), c('b', 2)] }]);
    const r = await new ListarDiario(repo).ejecutar([]);
    expect(r.grupos.map((g) => [g.titulo, g.total])).toEqual([['Septiembre 2026', 2]]);
    expect(r.hayMas).toBe(false);
  });

  it('avisa que hay más cuando la página trae un cursor', async () => {
    const repo = new Repo([{ consultas: [c('a', 28)], siguiente: 'cursor-1' as unknown as CursorDelDiario }]);
    const r = await new ListarDiario(repo).ejecutar([]);
    expect(r.hayMas).toBe(true);
    expect(r.siguiente).toBe('cursor-1');
  });

  it('al cargar más suma lo ya mostrado y usa el cursor', async () => {
    const repo = new Repo([{ consultas: [c('b', 10)] }]);
    const previas = [c('a', 28)];
    const r = await new ListarDiario(repo).ejecutar(previas, 'cursor-1' as unknown as CursorDelDiario);
    expect(repo.llamadas).toEqual(['cursor-1']);
    expect(r.consultas.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r.grupos).toHaveLength(1);
  });
});

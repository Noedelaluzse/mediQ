import { describe, expect, it } from 'vitest';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';
import { CargarTodoElDiario, MAXIMO_DE_CONSULTAS_A_BUSCAR } from './CargarTodoElDiario';

const consulta = (n: number): ConsultaDelDiario => ({ id: `c${n}`, fecha: new Date(2026, 0, n + 1), especialidad: 'otra', tipo: 'otro' });
const cursor = (n: number) => ({ n }) as unknown as CursorDelDiario;

/** Diario en memoria con páginas de `tamano`. */
class Diario implements DiarioRepository {
  paginasPedidas = 0;
  constructor(
    private readonly total: number,
    private readonly tamano = 20,
  ) {}
  async pagina(c?: CursorDelDiario): Promise<PaginaDelDiario> {
    this.paginasPedidas++;
    const desde = c ? (c as unknown as { n: number }).n : 0;
    const hasta = Math.min(desde + this.tamano, this.total);
    return { consultas: Array.from({ length: hasta - desde }, (_, i) => consulta(desde + i)), siguiente: hasta < this.total ? cursor(hasta) : undefined };
  }
}

describe('CargarTodoElDiario', () => {
  it('junta todas las páginas en orden', async () => {
    const diario = new Diario(45);
    const r = await new CargarTodoElDiario(diario).ejecutar();
    expect(r.consultas).toHaveLength(45);
    expect(r.consultas[0].id).toBe('c0');
    expect(r.consultas[44].id).toBe('c44');
    expect(diario.paginasPedidas).toBe(3);
    expect(r.truncado).toBe(false);
  });

  it('un diario vacío devuelve una lista vacía con una sola lectura', async () => {
    const diario = new Diario(0);
    const r = await new CargarTodoElDiario(diario).ejecutar();
    expect(r).toEqual({ consultas: [], truncado: false });
    expect(diario.paginasPedidas).toBe(1);
  });

  it(`se detiene en ${MAXIMO_DE_CONSULTAS_A_BUSCAR} consultas y lo avisa`, async () => {
    const r = await new CargarTodoElDiario(new Diario(MAXIMO_DE_CONSULTAS_A_BUSCAR + 500, 100)).ejecutar();
    expect(r.consultas).toHaveLength(MAXIMO_DE_CONSULTAS_A_BUSCAR);
    expect(r.truncado).toBe(true);
  });

  it('si una página falla, el error llega a quien llamó (la pantalla ofrece reintentar)', async () => {
    const roto: DiarioRepository = { pagina: async () => Promise.reject(new Error('sin red')) };
    await expect(new CargarTodoElDiario(roto).ejecutar()).rejects.toThrow('sin red');
  });
});

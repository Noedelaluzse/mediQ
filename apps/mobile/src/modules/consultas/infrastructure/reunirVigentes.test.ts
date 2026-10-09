import { describe, expect, it } from 'vitest';

import { reunirVigentes } from './reunirVigentes';

/**
 * AUD-12 / F067: las consultas borradas se descartan en el teléfono (para no exigir un índice compuesto). Una consulta de «próxima cita» pedía
 * solo 10 documentos y descartaba las borradas DESPUÉS: con 10 borradas con citas tempranas, la vigente que venía después nunca se leía y la
 * tarjeta «Próxima cita» desaparecía. `reunirVigentes` sigue pidiendo páginas hasta juntar las que se quieren o agotar los documentos.
 */
type Doc = { id: number; vigente: boolean };
const docs = (vigentes: boolean[]): Doc[] => vigentes.map((vigente, id) => ({ id, vigente }));

/** Un «servidor» falso con paginación por cursor: devuelve páginas de `tamano` documentos después del cursor y cuenta las peticiones. */
const servidor = (todos: Doc[], tamano: number) => {
  let peticiones = 0;
  return {
    get peticiones() {
      return peticiones;
    },
    pedir: async (despuesDe: Doc | undefined) => {
      peticiones++;
      const inicio = despuesDe ? todos.findIndex((d) => d.id === despuesDe.id) + 1 : 0;
      return todos.slice(inicio, inicio + tamano);
    },
  };
};
const convertir = (d: Doc) => (d.vigente ? d.id : null);

describe('reunirVigentes', () => {
  it('el caso reproducido: 10 borradas primero y 1 vigente después → la vigente aparece', async () => {
    const s = servidor(docs([...Array(10).fill(false), true]), 10);
    expect(await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: s.pedir, convertir })).toEqual([10]);
    expect(s.peticiones).toBe(2);
  });

  it('junta hasta `cuantos` vigentes, en el orden recibido, saltando las borradas intercaladas', async () => {
    const s = servidor(docs(Array.from({ length: 40 }, (_, i) => i % 3 !== 0)), 10);
    const r = await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: s.pedir, convertir });
    expect(r).toHaveLength(10);
    expect(r).toEqual([...r].sort((a, b) => a - b));
    expect(new Set(r).size).toBe(10); // sin repetidas
    expect(r.every((id) => id % 3 !== 0)).toBe(true);
  });

  it('no pide más páginas de las necesarias: con las vigentes en la primera página, una sola petición', async () => {
    const s = servidor(docs(Array(30).fill(true)), 10);
    expect(await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: s.pedir, convertir })).toHaveLength(10);
    expect(s.peticiones).toBe(1);
  });

  it('si todas están borradas devuelve vacío y se detiene al agotarse (no se queda pidiendo)', async () => {
    const s = servidor(docs(Array(25).fill(false)), 10);
    expect(await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: s.pedir, convertir })).toEqual([]);
    expect(s.peticiones).toBe(3); // 10 + 10 + 5 (la última página incompleta indica que ya no hay más)
  });

  it('una colección vacía no da error y pide una sola vez', async () => {
    const s = servidor([], 10);
    expect(await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: s.pedir, convertir })).toEqual([]);
    expect(s.peticiones).toBe(1);
  });

  it('si hay menos vigentes que las pedidas devuelve las que haya, con una página exacta al final', async () => {
    const s = servidor(docs([true, false, true, false, true, false, true, false, true, false]), 5);
    expect(await reunirVigentes({ tamanoDePagina: 5, cuantos: 20, pedir: s.pedir, convertir })).toEqual([0, 2, 4, 6, 8]);
  });

  it('cada petición recibe el último documento de la anterior (sin saltos ni repeticiones)', async () => {
    const cursores: (number | undefined)[] = [];
    const todos = docs(Array(25).fill(false));
    const s = servidor(todos, 10);
    await reunirVigentes({ tamanoDePagina: 10, cuantos: 10, pedir: (c) => (cursores.push(c?.id), s.pedir(c)), convertir });
    expect(cursores).toEqual([undefined, 9, 19]);
  });
});

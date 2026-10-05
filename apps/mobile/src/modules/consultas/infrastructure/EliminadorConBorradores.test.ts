import { describe, expect, it, vi } from 'vitest';

import { EliminadorConBorradores } from './EliminadorConBorradores';

describe('EliminadorConBorradores (RNF-07: eliminar la cuenta borra también lo local)', () => {
  it('borra primero los datos remotos y luego el borrador local', async () => {
    const orden: string[] = [];
    const e = new EliminadorConBorradores(
      { eliminarTodo: async (id) => void orden.push(`remoto:${id}`) },
      { borrar: async () => void orden.push('local') },
    );
    await e.eliminarTodo('u1');
    expect(orden).toEqual(['remoto:u1', 'local']);
  });

  it('si falla el borrado remoto, falla y no toca lo local (se puede reintentar)', async () => {
    const borrar = vi.fn(async () => {});
    const e = new EliminadorConBorradores({ eliminarTodo: async () => Promise.reject(new Error('sin red')) }, { borrar });
    await expect(e.eliminarTodo('u1')).rejects.toThrow('sin red');
    expect(borrar).not.toHaveBeenCalled();
  });

  it('si falla el borrado local no impide eliminar la cuenta', async () => {
    const e = new EliminadorConBorradores({ eliminarTodo: async () => {} }, { borrar: async () => Promise.reject(new Error('sqlite')) });
    await expect(e.eliminarTodo('u1')).resolves.toBeUndefined();
  });
});

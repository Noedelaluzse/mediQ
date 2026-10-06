import { describe, expect, it } from 'vitest';

import { SesionQueCancelaAvisos } from './SesionQueCancelaAvisos';

const armar = (cancelar: () => Promise<void>) => {
  const eventos: string[] = [];
  const sesiones = {
    leer: async () => 'sesion',
    guardar: async (s: string) => void eventos.push(`guardar:${s}`),
    borrar: async () => void eventos.push('borrar'),
  };
  const programador = {
    cancelarTodos: async () => {
      eventos.push('cancelar');
      await cancelar();
    },
  };
  return { eventos, store: new SesionQueCancelaAvisos(sesiones, programador) };
};

describe('SesionQueCancelaAvisos (privacidad: sin avisos de una cuenta que ya cerró sesión o se eliminó)', () => {
  it('al borrar la sesión cancela primero los avisos y luego borra', async () => {
    const { eventos, store } = armar(async () => undefined);
    await store.borrar();
    expect(eventos).toEqual(['cancelar', 'borrar']);
  });

  it('si cancelar falla, la sesión se borra igual', async () => {
    const { eventos, store } = armar(async () => Promise.reject(new Error('sistema')));
    await store.borrar();
    expect(eventos).toEqual(['cancelar', 'borrar']);
  });

  it('leer y guardar pasan directo', async () => {
    const { eventos, store } = armar(async () => undefined);
    expect(await store.leer()).toBe('sesion');
    await store.guardar('x');
    expect(eventos).toEqual(['guardar:x']);
  });
});

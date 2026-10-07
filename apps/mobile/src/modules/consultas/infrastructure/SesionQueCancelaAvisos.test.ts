import { describe, expect, it } from 'vitest';

import { SesionQueCancelaAvisos } from './SesionQueCancelaAvisos';

const armar = (cancelar: () => Promise<void>, limpiezas: (() => Promise<void>)[] = []) => {
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
  return { eventos, store: new SesionQueCancelaAvisos(sesiones, programador, limpiezas) };
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

  it('también limpia lo que se guardó en el teléfono (copia de lectura y cola de envío), antes de borrar la sesión', async () => {
    const eventos2: string[] = [];
    const { eventos, store } = armar(async () => undefined, [async () => void eventos2.push('copia'), async () => void eventos2.push('cola')]);
    await store.borrar();
    expect(eventos2).toEqual(['copia', 'cola']);
    expect(eventos).toEqual(['cancelar', 'borrar']);
  });

  it('si una limpieza falla, las demás y el borrado de la sesión siguen', async () => {
    const hechas: string[] = [];
    const { eventos, store } = armar(async () => undefined, [async () => Promise.reject(new Error('disco')), async () => void hechas.push('cola')]);
    await store.borrar();
    expect(hechas).toEqual(['cola']);
    expect(eventos).toEqual(['cancelar', 'borrar']);
  });

  it('leer y guardar pasan directo', async () => {
    const { eventos, store } = armar(async () => undefined);
    expect(await store.leer()).toBe('sesion');
    await store.guardar('x');
    expect(eventos).toEqual(['guardar:x']);
  });
});

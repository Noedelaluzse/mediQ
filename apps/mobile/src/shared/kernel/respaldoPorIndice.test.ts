import { describe, expect, it } from 'vitest';

import { esFaltaDeIndice, esFaltaDeIndiceOAgregacion, RespaldoPorIndice } from './respaldoPorIndice';

/**
 * F077 (AUD-12, parte 2): la consulta con filtro en el servidor necesita un índice compuesto desplegado en Firebase. Mientras no exista (o se
 * esté construyendo), Firestore responde `failed-precondition`: la app debe seguir funcionando con el método anterior, sin enseñar un error.
 */
const faltaIndice = Object.assign(new Error('The query requires an index'), { code: 'failed-precondition' });
const permisos = Object.assign(new Error('Missing or insufficient permissions'), { code: 'permission-denied' });

describe('esFaltaDeIndice', () => {
  it('solo reconoce el error de índice faltante (`failed-precondition`)', () => {
    expect(esFaltaDeIndice(faltaIndice)).toBe(true);
    expect(esFaltaDeIndice(permisos)).toBe(false);
    expect(esFaltaDeIndice(new Error('sin red'))).toBe(false);
    expect(esFaltaDeIndice(null)).toBe(false);
    expect(esFaltaDeIndice(undefined)).toBe(false);
  });
});

describe('RespaldoPorIndice', () => {
  const montar = (inicio = 1_000_000) => {
    let ahora = inicio;
    const llamadas = { servidor: 0, respaldo: 0 };
    const r = new RespaldoPorIndice(() => ahora, 5 * 60_000);
    return {
      r,
      llamadas,
      avanzar: (ms: number) => (ahora += ms),
      conServidor: (resultado: () => Promise<string>) => r.ejecutar(async () => (llamadas.servidor++, resultado()), async () => (llamadas.respaldo++, 'respaldo')),
    };
  };

  it('con el índice listo usa el filtro del servidor y nunca el respaldo', async () => {
    const m = montar();
    expect(await m.conServidor(async () => 'servidor')).toBe('servidor');
    expect(m.llamadas).toEqual({ servidor: 1, respaldo: 0 });
  });

  it('si falta el índice cae al método anterior en esa misma llamada (la persona no ve ningún error)', async () => {
    const m = montar();
    expect(await m.conServidor(async () => Promise.reject(faltaIndice))).toBe('respaldo');
    expect(m.llamadas).toEqual({ servidor: 1, respaldo: 1 });
  });

  it('después de un fallo por índice no vuelve a intentar el servidor hasta pasar el tiempo de espera', async () => {
    const m = montar();
    await m.conServidor(async () => Promise.reject(faltaIndice));
    m.avanzar(60_000);
    expect(await m.conServidor(async () => 'servidor')).toBe('respaldo');
    expect(m.llamadas).toEqual({ servidor: 1, respaldo: 2 });
  });

  it('pasado el tiempo de espera vuelve a probar el servidor (el índice ya pudo construirse) y, si funciona, se queda con él', async () => {
    const m = montar();
    await m.conServidor(async () => Promise.reject(faltaIndice));
    m.avanzar(5 * 60_000);
    expect(await m.conServidor(async () => 'servidor')).toBe('servidor');
    expect(await m.conServidor(async () => 'servidor')).toBe('servidor');
    expect(m.llamadas.respaldo).toBe(1);
  });

  it('un error que NO es de índice (permisos, red, un bug) sube tal cual: no se esconde detrás del respaldo', async () => {
    const m = montar();
    await expect(m.conServidor(async () => Promise.reject(permisos))).rejects.toThrow('Missing or insufficient permissions');
    await expect(m.conServidor(async () => Promise.reject(new Error('sin red')))).rejects.toThrow('sin red');
    expect(m.llamadas.respaldo).toBe(0);
  });

  it('si el respaldo también falla, ese error sube', async () => {
    const r = new RespaldoPorIndice(() => 0, 1000);
    await expect(r.ejecutar(async () => Promise.reject(faltaIndice), async () => Promise.reject(new Error('sin red')))).rejects.toThrow('sin red');
  });
});

describe('conteos del servidor (F068): un predicado más amplio', () => {
  it('además de la falta de índice, reconoce que la agregación no está disponible (`unimplemented`)', () => {
    expect(esFaltaDeIndiceOAgregacion(faltaIndice)).toBe(true);
    expect(esFaltaDeIndiceOAgregacion(Object.assign(new Error('x'), { code: 'unimplemented' }))).toBe(true);
    expect(esFaltaDeIndiceOAgregacion(permisos)).toBe(false);
  });

  it('con ese predicado, `RespaldoPorIndice` cae al respaldo en los dos casos y sigue sin esconder permisos', async () => {
    const r = new RespaldoPorIndice(() => 0, 1000, esFaltaDeIndiceOAgregacion);
    expect(await r.ejecutar(async () => Promise.reject(Object.assign(new Error('x'), { code: 'unimplemented' })), async () => 'respaldo')).toBe('respaldo');
    await expect(new RespaldoPorIndice(() => 0, 1000, esFaltaDeIndiceOAgregacion).ejecutar(async () => Promise.reject(permisos), async () => 'respaldo')).rejects.toThrow('Missing');
  });
});


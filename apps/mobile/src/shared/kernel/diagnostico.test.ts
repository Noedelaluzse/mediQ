import { describe, expect, it } from 'vitest';

import { crearDiagnostico } from './diagnostico';

const montar = (activo: boolean) => {
  const salida: unknown[][] = [];
  return { salida, diagnostico: crearDiagnostico(() => activo, (...args) => void salida.push(args)) };
};

describe('diagnostico (los avisos para el programador no salen en la app publicada)', () => {
  it('en desarrollo escribe el aviso con el prefijo de MediQ y el detalle', () => {
    const { salida, diagnostico } = montar(true);
    const error = new Error('x');
    diagnostico.advertir('no se pudo guardar', error);
    expect(salida).toEqual([['[MediQ] no se pudo guardar', error]]);
  });

  it('en la app publicada no escribe nada (un error puede traer rutas o ids de la cuenta)', () => {
    const { salida, diagnostico } = montar(false);
    diagnostico.advertir('no se pudo guardar', new Error('x'));
    diagnostico.informar('modo: Firebase real');
    expect(salida).toEqual([]);
  });

  it('informar también lleva el prefijo y se apaga igual', () => {
    const { salida, diagnostico } = montar(true);
    diagnostico.informar('modo: Firebase real');
    expect(salida).toEqual([['[MediQ] modo: Firebase real']]);
  });

  it('decide en el momento de escribir, no al crearlo', () => {
    let activo = false;
    const salida: unknown[][] = [];
    const d = crearDiagnostico(() => activo, (...args) => void salida.push(args));
    d.advertir('a');
    activo = true;
    d.advertir('b');
    expect(salida).toEqual([['[MediQ] b']]);
  });
});

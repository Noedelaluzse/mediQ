import { describe, expect, it } from 'vitest';

import { leerPreferencia, PreferenciaDelCandadoIlegibleError } from './preferenciaDelCandado';

describe('leerPreferencia', () => {
  it('lee lo guardado', () => {
    expect(leerPreferencia('{"activado":true,"ofrecido":true}')).toEqual({ activado: true, ofrecido: true });
  });

  it('sin nada guardado empieza apagada y sin ofrecer', () => {
    expect(leerPreferencia(null)).toEqual({ activado: false, ofrecido: false });
  });

  it('un texto dañado o con otra forma NO cuenta como apagada: no se puede comprobar el candado (F072)', () => {
    expect(() => leerPreferencia('{no es json')).toThrow(PreferenciaDelCandadoIlegibleError);
    expect(() => leerPreferencia('"hola"')).toThrow(PreferenciaDelCandadoIlegibleError);
    expect(() => leerPreferencia('{"activado":"si"}')).toThrow(PreferenciaDelCandadoIlegibleError);
    expect(() => leerPreferencia('')).toThrow(PreferenciaDelCandadoIlegibleError);
  });

  it('si falta «ofrecido» se toma como no ofrecido', () => {
    expect(leerPreferencia('{"activado":true}')).toEqual({ activado: true, ofrecido: false });
  });
});

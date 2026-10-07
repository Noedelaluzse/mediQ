import { describe, expect, it } from 'vitest';

import { leerPreferencia } from './preferenciaDelCandado';

describe('leerPreferencia', () => {
  it('lee lo guardado', () => {
    expect(leerPreferencia('{"activado":true,"ofrecido":true}')).toEqual({ activado: true, ofrecido: true });
  });

  it('sin nada guardado empieza apagada y sin ofrecer', () => {
    expect(leerPreferencia(null)).toEqual({ activado: false, ofrecido: false });
  });

  it('un texto dañado o con otra forma cuenta como apagada', () => {
    expect(leerPreferencia('{no es json')).toEqual({ activado: false, ofrecido: false });
    expect(leerPreferencia('"hola"')).toEqual({ activado: false, ofrecido: false });
    expect(leerPreferencia('{"activado":"si"}')).toEqual({ activado: false, ofrecido: false });
  });

  it('si falta «ofrecido» se toma como no ofrecido', () => {
    expect(leerPreferencia('{"activado":true}')).toEqual({ activado: true, ofrecido: false });
  });
});

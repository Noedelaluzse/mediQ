import { describe, expect, it } from 'vitest';

import { UMBRAL_PARA_MOSTRAR, UMBRAL_PARA_OCULTAR, visibilidadDeLaBarra } from './barraDeBusqueda';

const base = { visible: false, mantener: false, alSoltar: false };

describe('visibilidadDeLaBarra (barra oculta que aparece al arrastrar hacia abajo)', () => {
  it('con la barra oculta, un arrastre fuerte hacia abajo (rebote) al soltar la muestra', () => {
    expect(visibilidadDeLaBarra({ ...base, y: -UMBRAL_PARA_MOSTRAR, alSoltar: true })).toBe(true);
    expect(visibilidadDeLaBarra({ ...base, y: -UMBRAL_PARA_MOSTRAR - 40, alSoltar: true })).toBe(true);
  });

  it('un arrastre corto, o mientras el dedo sigue abajo, no la muestra', () => {
    expect(visibilidadDeLaBarra({ ...base, y: -UMBRAL_PARA_MOSTRAR + 1, alSoltar: true })).toBeNull();
    expect(visibilidadDeLaBarra({ ...base, y: -200, alSoltar: false })).toBeNull();
  });

  it('en reposo (arriba del todo, o bajando la lista) con la barra oculta no hace nada', () => {
    expect(visibilidadDeLaBarra({ ...base, y: 0, alSoltar: true })).toBeNull();
    expect(visibilidadDeLaBarra({ ...base, y: 300 })).toBeNull();
  });

  it('con la barra visible, al bajar la lista se oculta', () => {
    expect(visibilidadDeLaBarra({ ...base, visible: true, y: UMBRAL_PARA_OCULTAR })).toBe(false);
    expect(visibilidadDeLaBarra({ ...base, visible: true, y: 400 })).toBe(false);
  });

  it('con la barra visible, en reposo arriba o en el rebote se queda', () => {
    expect(visibilidadDeLaBarra({ ...base, visible: true, y: 0 })).toBeNull();
    expect(visibilidadDeLaBarra({ ...base, visible: true, y: UMBRAL_PARA_OCULTAR - 1 })).toBeNull();
    expect(visibilidadDeLaBarra({ ...base, visible: true, y: -80, alSoltar: true })).toBeNull();
  });

  it('mientras haya texto o el campo esté en uso (mantener) nunca se oculta', () => {
    expect(visibilidadDeLaBarra({ visible: true, mantener: true, y: 500, alSoltar: false })).toBeNull();
    expect(visibilidadDeLaBarra({ visible: true, mantener: true, y: 0, alSoltar: true })).toBeNull();
  });

  it('si hay que mantenerla y está oculta, se muestra', () => {
    expect(visibilidadDeLaBarra({ visible: false, mantener: true, y: 0, alSoltar: false })).toBe(true);
  });
});

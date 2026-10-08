import { describe, expect, it } from 'vitest';

import { TEXTOS_AL_QUITAR_FOTO } from './quitarFoto';
import { TEXTOS_AL_QUITAR } from './quitarDeReceta';

describe('textos al quitar la foto de la receta (F055)', () => {
  it('antes de borrar se pregunta, y se dice que se borra de la cuenta', () => {
    expect(TEXTOS_AL_QUITAR_FOTO.confirmar.titulo).toBe('¿Quitar la foto?');
    expect(TEXTOS_AL_QUITAR_FOTO.confirmar.mensaje).toMatch(/borrar/i);
  });

  it('al terminar se avisa que la foto se quitó', () => {
    expect(TEXTOS_AL_QUITAR_FOTO.hecho.titulo).toBe('Foto quitada');
    expect(TEXTOS_AL_QUITAR_FOTO.hecho.mensaje.length).toBeGreaterThan(0);
  });

  it('si falla, el aviso lo dice y sugiere revisar la conexión', () => {
    expect(TEXTOS_AL_QUITAR_FOTO.fallo.titulo).toBe('No pudimos quitar la foto');
    expect(TEXTOS_AL_QUITAR_FOTO.fallo.mensaje).toMatch(/conexión/i);
  });

  it('no se confunde con los avisos de quitar la receta (F050)', () => {
    expect(TEXTOS_AL_QUITAR_FOTO.hecho.titulo).not.toBe(TEXTOS_AL_QUITAR.hecho.titulo);
    expect(TEXTOS_AL_QUITAR_FOTO.confirmar.titulo).not.toBe(TEXTOS_AL_QUITAR.receta.titulo);
  });
});

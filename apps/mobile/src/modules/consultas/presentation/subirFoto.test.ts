import { describe, expect, it } from 'vitest';

import { TEXTOS_AL_QUITAR_FOTO } from './quitarFoto';
import { TEXTOS_AL_SUBIR_FOTO } from './subirFoto';

describe('textos al subir la foto de la receta (F056)', () => {
  it('mientras se sube se dice que se está subiendo', () => {
    expect(TEXTOS_AL_SUBIR_FOTO.subiendo).toMatch(/subiendo/i);
  });

  it('la primera vez avisa «Foto guardada»', () => {
    const t = TEXTOS_AL_SUBIR_FOTO.hecho(false);
    expect(t.titulo).toBe('Foto guardada');
    expect(t.mensaje.length).toBeGreaterThan(0);
  });

  it('al reemplazar avisa «Foto reemplazada»', () => {
    expect(TEXTOS_AL_SUBIR_FOTO.hecho(true).titulo).toBe('Foto reemplazada');
  });

  it('no se confunde con el aviso de quitar la foto', () => {
    expect(TEXTOS_AL_SUBIR_FOTO.hecho(false).titulo).not.toBe(TEXTOS_AL_QUITAR_FOTO.hecho.titulo);
    expect(TEXTOS_AL_SUBIR_FOTO.hecho(true).titulo).not.toBe(TEXTOS_AL_QUITAR_FOTO.hecho.titulo);
  });
});

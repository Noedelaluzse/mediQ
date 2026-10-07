import { describe, expect, it } from 'vitest';

import { accionAlGuardar, accionAlQuitarFila, TEXTOS_AL_QUITAR } from './quitarDeReceta';
import { filaNueva, type FilaDeMedicamento } from './receta';

const conNombre = (nombre: string): FilaDeMedicamento => ({ ...filaNueva(), nombre });

describe('accionAlQuitarFila (qué pasa al tocar «Quitar» en un medicamento)', () => {
  it('una fila sin tocar se quita sin preguntar', () => {
    expect(accionAlQuitarFila([conNombre('A'), filaNueva()], 1, true)).toBe('quitar');
  });

  it('una fila con algo escrito pide confirmación', () => {
    expect(accionAlQuitarFila([conNombre('A'), conNombre('B')], 0, true)).toBe('confirmar');
    expect(accionAlQuitarFila([conNombre('A'), conNombre('B')], 0, false)).toBe('confirmar');
  });

  it('quitar el único medicamento de una receta ya guardada es quitar la receta completa', () => {
    expect(accionAlQuitarFila([conNombre('A')], 0, true)).toBe('quitar-receta');
    // las filas en blanco que sobran no cuentan como medicamentos
    expect(accionAlQuitarFila([conNombre('A'), filaNueva()], 0, true)).toBe('quitar-receta');
  });

  it('si la receta nunca se guardó, quitar el único medicamento solo vacía el formulario', () => {
    expect(accionAlQuitarFila([conNombre('A')], 0, false)).toBe('confirmar');
  });
});

describe('accionAlGuardar', () => {
  it('guardar con la lista vacía sobre una receta guardada la quita (y se confirma antes)', () => {
    expect(accionAlGuardar([filaNueva()], true)).toBe('quitar-receta');
  });

  it('con medicamentos se guarda normal', () => {
    expect(accionAlGuardar([conNombre('A')], true)).toBe('guardar');
  });

  it('sin receta guardada y sin medicamentos no hay nada que confirmar', () => {
    expect(accionAlGuardar([filaNueva()], false)).toBe('guardar');
  });
});

describe('textos', () => {
  it('avisan qué se pierde y confirman cuando ya pasó', () => {
    expect(TEXTOS_AL_QUITAR.receta.titulo).toBe('¿Quitar la receta?');
    expect(TEXTOS_AL_QUITAR.receta.mensaje).toMatch(/avisos de toma/);
    expect(TEXTOS_AL_QUITAR.hecho.titulo).toBe('Receta quitada');
    expect(TEXTOS_AL_QUITAR.fila(true).mensaje).toMatch(/Guardar receta/);
    expect(TEXTOS_AL_QUITAR.fila(false).mensaje).not.toMatch(/Guardar receta/);
  });
});

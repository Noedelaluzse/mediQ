import { describe, expect, it } from 'vitest';

import { crearReceta } from '../domain/Receta';
import { aEntradas, agregarFila, cambiarCampo, escribirDosisAMano, filaNueva, type FilaDeMedicamento } from './receta';
import { erroresDeFilas, hayErrores, MENSAJE_GENERAL_DE_RECETA } from './erroresDeReceta';

const con = (cambios: Partial<FilaDeMedicamento>): FilaDeMedicamento => ({ ...filaNueva(), nombre: 'Losartán', ...cambios });
const letras = (n: number) => 'a'.repeat(n);

describe('erroresDeFilas (cada error marca SU campo, con un texto corto)', () => {
  it('una fila correcta no tiene errores', () => {
    expect(erroresDeFilas([con({})])).toEqual([{}]);
    expect(hayErrores(erroresDeFilas([con({})]))).toBe(false);
  });

  it('una fila nueva que nadie tocó no es un medicamento: sin errores aunque no tenga nombre', () => {
    expect(erroresDeFilas([filaNueva()])).toEqual([{}]);
  });

  it('tocada y sin nombre: pide el nombre (con solo espacios también)', () => {
    expect(erroresDeFilas([con({ nombre: '', indicaciones: 'Con agua' })])[0]).toEqual({ nombre: 'Escribe el nombre del medicamento' });
    expect(erroresDeFilas([con({ nombre: '    ', indicaciones: 'Con agua' })])[0].nombre).toBe('Escribe el nombre del medicamento');
    // Una fila con solo espacios y nada más tocado sigue siendo una fila que nadie tocó.
    expect(erroresDeFilas([con({ nombre: '    ' })])[0]).toEqual({});
  });

  it('el nombre admite hasta 80 letras (sin contar espacios de los lados)', () => {
    expect(erroresDeFilas([con({ nombre: `  ${letras(80)}  ` })])[0]).toEqual({});
    expect(erroresDeFilas([con({ nombre: letras(81) })])[0]).toEqual({ nombre: 'El nombre puede tener hasta 80 letras' });
  });

  it('las indicaciones admiten hasta 300', () => {
    expect(erroresDeFilas([con({ indicaciones: letras(300) })])[0]).toEqual({});
    expect(erroresDeFilas([con({ indicaciones: letras(301) })])[0]).toEqual({ indicaciones: 'Las indicaciones pueden tener hasta 300 letras' });
  });

  it('lo escrito en «Otra…» (dosis, vía, frecuencia, duración) admite hasta 60', () => {
    for (const campo of ['dosis', 'via', 'frecuencia', 'duracion'] as const) {
      expect(erroresDeFilas([con({ [campo]: letras(60) })])[0][campo], campo).toBeUndefined();
      expect(erroresDeFilas([con({ [campo]: letras(61) })])[0][campo], campo).toBe('Máximo 60 letras');
    }
  });

  it('varios errores a la vez en la misma fila, y cada fila con los suyos', () => {
    const e = erroresDeFilas([con({}), con({ nombre: '', indicaciones: letras(301) }), con({ dosis: letras(61) })]);
    expect(e[0]).toEqual({});
    expect(e[1]).toEqual({ nombre: 'Escribe el nombre del medicamento', indicaciones: 'Las indicaciones pueden tener hasta 300 letras' });
    expect(e[2]).toEqual({ dosis: 'Máximo 60 letras' });
    expect(hayErrores(e)).toBe(true);
  });

  it('el texto general de respaldo es una sola frase simple', () => {
    expect(MENSAJE_GENERAL_DE_RECETA).toBe('Revisa los datos del medicamento');
  });
});

describe('coincide con el dominio (el dominio sigue siendo la última barrera)', () => {
  const casos: FilaDeMedicamento[][] = [
    [con({})],
    [con({ nombre: '' , indicaciones: 'x' })],
    [con({ nombre: letras(81) })],
    [con({ indicaciones: letras(301) })],
    [escribirDosisAMano(con({}), letras(61))],
    [con({}), agregarFila([])[0], con({ nombre: 'Aspirina' })],
    [cambiarCampo([con({})], 0, 'nombre', '  Paracetamol  ')[0]],
  ];
  it.each(casos.map((c, i) => [i, c] as const))('caso %i: sin errores si y solo si el dominio acepta', (_i, filas) => {
    const sinErrores = !hayErrores(erroresDeFilas(filas));
    expect(crearReceta(aEntradas(filas)).ok).toBe(sinErrores);
  });
});

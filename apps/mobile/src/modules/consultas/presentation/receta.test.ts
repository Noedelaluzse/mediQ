import { describe, expect, it } from 'vitest';

import { agregarFila, aEntradas, cambiarCampo, estadoDesdeReceta, filaVacia, quitarFila, resumenDelMedicamento } from './receta';

describe('formulario de la receta', () => {
  it('empieza con una fila vacía cuando no hay receta', () => {
    expect(estadoDesdeReceta([])).toHaveLength(1);
    expect(estadoDesdeReceta([])[0]).toEqual(filaVacia());
  });

  it('carga los medicamentos guardados, con campos vacíos donde faltan', () => {
    const filas = estadoDesdeReceta([{ nombre: 'Losartán', dosis: '50 mg' }]);
    expect(filas).toEqual([{ nombre: 'Losartán', dosis: '50 mg', frecuencia: '', duracion: '', via: '', indicaciones: '' }]);
  });

  it('agrega, cambia y quita filas sin mutar la lista original', () => {
    const una = [filaVacia()];
    const dos = agregarFila(una);
    expect(una).toHaveLength(1);
    expect(dos).toHaveLength(2);
    expect(cambiarCampo(dos, 1, 'nombre', 'Aspirina')[1].nombre).toBe('Aspirina');
    expect(dos[1].nombre).toBe('');
    expect(quitarFila(dos, 0)).toHaveLength(1);
  });

  it('quitar la única fila deja una fila vacía', () => {
    expect(quitarFila([{ ...filaVacia(), nombre: 'X' }], 0)).toEqual([filaVacia()]);
  });

  it('al guardar se descartan las filas totalmente vacías', () => {
    const filas = [{ ...filaVacia(), nombre: 'Losartán' }, filaVacia(), { ...filaVacia(), dosis: '5 ml' }];
    expect(aEntradas(filas)).toEqual([
      { nombre: 'Losartán', dosis: '', frecuencia: '', duracion: '', via: '', indicaciones: '' },
      { nombre: '', dosis: '5 ml', frecuencia: '', duracion: '', via: '', indicaciones: '' },
    ]);
  });
});

describe('resumenDelMedicamento', () => {
  it('une dosis, frecuencia, duración y vía con puntos medios', () => {
    expect(resumenDelMedicamento({ nombre: 'Losartán', dosis: '50 mg', frecuencia: 'cada 24 h', duracion: '30 días', via: 'Oral' })).toBe('50 mg · cada 24 h · 30 días · Oral');
  });
  it('omite lo que falta y queda vacío si no hay nada', () => {
    expect(resumenDelMedicamento({ nombre: 'A', dosis: '5 ml', via: 'Oral' })).toBe('5 ml · Oral');
    expect(resumenDelMedicamento({ nombre: 'A' })).toBe('');
  });
});

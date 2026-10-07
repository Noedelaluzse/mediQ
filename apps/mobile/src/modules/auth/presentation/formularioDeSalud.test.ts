import { describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { agregarEnLista, alternarSinAlergias, aDatos, desdeDatos, fechaAIso, isoAFecha, nacimientoPorDefecto, quitarDeLista, VACIO } from './formularioDeSalud';

const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'mujer',
  tipoDeSangre: 'AB+',
  alergias: { sinConocidas: false, items: ['Polen'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe('fechas del formulario (solo día, sin hora ni zona)', () => {
  it('de Date a texto y de vuelta usan el día local', () => {
    expect(fechaAIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    const f = isoAFecha('1990-03-14');
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([1990, 2, 14]);
  });

  // Bug de la fecha un día después: el selector de iOS usa la zona HISTÓRICA (en 1999 Cancún estaba en UTC-6) y JavaScript el
  // desfase de hoy (UTC-5), así que una fecha a medianoche la ve como las 23:00 del día anterior y al elegir otro día salta uno.
  // A mediodía una diferencia de horas no cambia el día.
  it('la fecha sin hora se guarda a mediodía, para que ninguna zona horaria la cambie de día', () => {
    expect(isoAFecha('1999-12-08').getHours()).toBe(12);
    expect(isoAFecha('1999-12-08').getMinutes()).toBe(0);
  });

  it('un corrimiento de horas (zona histórica) no cambia el día', () => {
    const f = isoAFecha('1999-12-08');
    for (const horas of [-3, -2, -1, 1, 2, 3]) {
      expect(fechaAIso(new Date(f.getTime() + horas * 3_600_000))).toBe('1999-12-08');
    }
  });

  it('la fecha que propone «Elegir fecha» también es a mediodía y de hace 30 años', () => {
    const f = nacimientoPorDefecto(new Date(2026, 9, 7, 8, 30));
    expect([f.getFullYear(), f.getMonth(), f.getDate(), f.getHours(), f.getMinutes()]).toEqual([1996, 9, 7, 12, 0]);
  });
});

describe('formulario ↔ datos', () => {
  it('lo vacío se queda vacío', () => {
    expect(desdeDatos(SIN_DATOS)).toEqual(VACIO);
    expect(aDatos(VACIO)).toEqual(SIN_DATOS);
  });

  it('ida y vuelta sin perder nada', () => {
    expect(aDatos(desdeDatos(completos))).toEqual(completos);
  });
});

describe('agregar y quitar alergias', () => {
  it('agrega a la lista que se pidió y deja la otra intacta', () => {
    const r = agregarEnLista(VACIO, 'alergias', 'Polen');
    expect(r.error).toBeUndefined();
    expect(r.formulario.alergias).toEqual(['Polen']);
    expect(r.formulario.medicamentos).toEqual([]);
    expect(agregarEnLista(VACIO, 'medicamentos', 'Penicilina').formulario.medicamentos).toEqual(['Penicilina']);
  });

  it('agregar una alergia desmarca «no tengo alergias»', () => {
    const r = agregarEnLista({ ...VACIO, sinAlergias: true }, 'alergias', 'Polen');
    expect(r.formulario.sinAlergias).toBe(false);
  });

  it('un texto vacío da error y no cambia nada', () => {
    const r = agregarEnLista(VACIO, 'alergias', '  ');
    expect(r.error).toBeTruthy();
    expect(r.formulario).toEqual(VACIO);
  });

  it('quita una etiqueta', () => {
    const f = { ...VACIO, alergias: ['Polen', 'Mariscos'] };
    expect(quitarDeLista(f, 'alergias', 'Polen').alergias).toEqual(['Mariscos']);
  });

  it('marcar «no tengo alergias» vacía esa lista; desmarcar la deja vacía', () => {
    const marcado = alternarSinAlergias({ ...VACIO, alergias: ['Polen'], medicamentos: ['Penicilina'] }, 'alergias');
    expect(marcado.sinAlergias).toBe(true);
    expect(marcado.alergias).toEqual([]);
    expect(marcado.medicamentos).toEqual(['Penicilina']);
    expect(alternarSinAlergias(marcado, 'alergias').sinAlergias).toBe(false);
  });

  it('lo mismo para las alergias a medicamentos', () => {
    const marcado = alternarSinAlergias({ ...VACIO, medicamentos: ['Penicilina'] }, 'medicamentos');
    expect(marcado.sinMedicamentos).toBe(true);
    expect(marcado.medicamentos).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { agregarEnLista, alternarSinAlergias, aDatos, desdeDatos, fechaAIso, isoAFecha, quitarDeLista, VACIO } from './formularioDeSalud';

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

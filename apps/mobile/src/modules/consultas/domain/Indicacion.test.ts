import { describe, expect, it } from 'vitest';

import { IndicacionInvalidaError } from './errors';
import { alternarIndicacion, crearIndicacion, resumenDeIndicaciones, type Indicacion } from './Indicacion';

describe('crearIndicacion (RF-15)', () => {
  it('crea una indicación pendiente con su texto recortado', () => {
    const r = crearIndicacion({ id: 'i1', texto: '  Medir la presión cada mañana ', orden: 0 });
    expect(r.ok && r.value).toEqual({ id: 'i1', texto: 'Medir la presión cada mañana', orden: 0, hechaEn: undefined });
  });

  it('el texto no puede estar vacío ni ser demasiado largo', () => {
    expect(crearIndicacion({ id: 'i1', texto: '   ', orden: 0 }).ok).toBe(false);
    const largo = crearIndicacion({ id: 'i1', texto: 'x'.repeat(301), orden: 0 });
    expect(!largo.ok && largo.error).toBeInstanceOf(IndicacionInvalidaError);
    expect(crearIndicacion({ id: 'i1', texto: 'x'.repeat(300), orden: 0 }).ok).toBe(true);
  });
});

describe('alternarIndicacion (marcar y desmarcar)', () => {
  const pendiente: Indicacion = { id: 'i1', texto: 'Análisis', orden: 1 };

  it('una pendiente se marca con la fecha de hoy', () => {
    const hoy = new Date(2026, 9, 5, 10, 0);
    expect(alternarIndicacion(pendiente, hoy)).toEqual({ ...pendiente, hechaEn: hoy });
  });

  it('una hecha vuelve a pendiente', () => {
    const hecha = { ...pendiente, hechaEn: new Date(2026, 9, 5) };
    expect(alternarIndicacion(hecha, new Date()).hechaEn).toBeUndefined();
  });
});

describe('resumenDeIndicaciones ("1 de 3 hechas")', () => {
  const i = (n: number, hecha: boolean): Indicacion => ({ id: String(n), texto: 't', orden: n, hechaEn: hecha ? new Date() : undefined });

  it('cuenta las hechas sobre el total', () => {
    expect(resumenDeIndicaciones([i(0, true), i(1, false), i(2, false)])).toBe('1 de 3 hechas');
  });

  it('sin indicaciones no dice nada', () => {
    expect(resumenDeIndicaciones([])).toBe('');
  });
});

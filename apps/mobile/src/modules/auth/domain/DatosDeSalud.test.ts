import { describe, expect, it } from 'vitest';

import {
  agregarAlergia,
  crearDatosDeSalud,
  edadEn,
  etiquetaDeSangre,
  MAX_ALERGIAS,
  nacimientoValido,
  pendientesDeSalud,
  resumenDePendientes,
  SIN_DATOS,
  TIPOS_DE_SANGRE,
  type DatosDeSalud,
} from './DatosDeSalud';

const hoy = new Date(2026, 9, 6);
const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'hombre',
  tipoDeSangre: 'O+',
  alergias: { sinConocidas: false, items: ['Polen'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe('edadEn (se calcula, no se guarda)', () => {
  it('cuenta los años cumplidos', () => {
    expect(edadEn('1990-03-14', hoy)).toBe(36);
    expect(edadEn('2026-01-01', hoy)).toBe(0);
  });

  it('el día del cumpleaños ya cumple; un día antes todavía no', () => {
    expect(edadEn('1990-10-06', hoy)).toBe(36);
    expect(edadEn('1990-10-07', hoy)).toBe(35);
  });

  it('nacer un 29 de febrero cumple el 1 de marzo en años no bisiestos', () => {
    expect(edadEn('2000-02-29', new Date(2026, 1, 28))).toBe(25);
    expect(edadEn('2000-02-29', new Date(2026, 2, 1))).toBe(26);
  });

  it('una fecha mal escrita o inexistente no tiene edad', () => {
    for (const mala of ['', 'abc', '1990-02-30', '1990-13-01', '90-03-14', '1990/03/14']) expect(edadEn(mala, hoy)).toBeNull();
  });
});

describe('nacimientoValido', () => {
  it('acepta fechas reales de hoy hacia atrás, hasta 120 años', () => {
    expect(nacimientoValido('2026-10-06', hoy)).toBe(true);
    expect(nacimientoValido('1990-03-14', hoy)).toBe(true);
    expect(nacimientoValido('1906-10-06', hoy)).toBe(true);
  });

  it('rechaza el futuro, más de 120 años y fechas imposibles', () => {
    expect(nacimientoValido('2026-10-07', hoy)).toBe(false);
    expect(nacimientoValido('1905-10-06', hoy)).toBe(false);
    expect(nacimientoValido('1990-02-30', hoy)).toBe(false);
    expect(nacimientoValido('nunca', hoy)).toBe(false);
  });
});

describe('tipos de sangre', () => {
  it('son los 8 del sistema ABO/Rh más «no lo sé»', () => {
    expect(TIPOS_DE_SANGRE).toEqual(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'desconocido']);
  });

  it('se muestran con signo menos y «No lo sé»', () => {
    expect(etiquetaDeSangre('O+')).toBe('O+');
    expect(etiquetaDeSangre('AB-')).toBe('AB−');
    expect(etiquetaDeSangre('desconocido')).toBe('No lo sé');
  });
});

describe('agregarAlergia', () => {
  it('agrega con los espacios recortados y juntos', () => {
    const r = agregarAlergia(['Polen'], '  Mariscos   del  mar ');
    expect(r).toEqual({ ok: true, value: ['Polen', 'Mariscos del mar'] });
  });

  it('un duplicado (sin importar mayúsculas ni acentos) no se repite y no es error', () => {
    expect(agregarAlergia(['Penicilina'], 'penicilína')).toEqual({ ok: true, value: ['Penicilina'] });
  });

  it('vacío o de más de 60 caracteres es error', () => {
    expect(agregarAlergia([], '   ').ok).toBe(false);
    expect(agregarAlergia([], 'x'.repeat(61)).ok).toBe(false);
    expect(agregarAlergia([], 'x'.repeat(60)).ok).toBe(true);
  });

  it('admite hasta 30 y la 31 es error', () => {
    const treinta = Array.from({ length: MAX_ALERGIAS }, (_, i) => `a${i}`);
    expect(agregarAlergia(treinta.slice(0, 29), 'nueva').ok).toBe(true);
    const r = agregarAlergia(treinta, 'otra');
    expect(r.ok).toBe(false);
  });
});

describe('crearDatosDeSalud', () => {
  it('acepta datos completos y los devuelve normalizados', () => {
    const r = crearDatosDeSalud({ ...completos, alergias: { sinConocidas: false, items: ['  Polen ', 'polen', 'Mariscos'] } }, hoy);
    expect(r.ok && r.value.alergias.items).toEqual(['Polen', 'Mariscos']);
  });

  it('acepta no tener ningún dato (todo es opcional)', () => {
    expect(crearDatosDeSalud(SIN_DATOS, hoy)).toEqual({ ok: true, value: SIN_DATOS });
  });

  it('rechaza un nacimiento futuro o imposible', () => {
    expect(crearDatosDeSalud({ ...completos, nacimiento: '2030-01-01' }, hoy).ok).toBe(false);
    expect(crearDatosDeSalud({ ...completos, nacimiento: '1990-02-30' }, hoy).ok).toBe(false);
  });

  it('rechaza un sexo o tipo de sangre fuera del catálogo', () => {
    expect(crearDatosDeSalud({ ...completos, sexo: 'x' as never }, hoy).ok).toBe(false);
    expect(crearDatosDeSalud({ ...completos, tipoDeSangre: 'Z+' as never }, hoy).ok).toBe(false);
  });

  it('«ninguna conocida» no puede venir con alergias escritas', () => {
    expect(crearDatosDeSalud({ ...completos, alergias: { sinConocidas: true, items: ['Polen'] } }, hoy).ok).toBe(false);
    expect(crearDatosDeSalud({ ...completos, alergiasAMedicamentos: { sinConocidas: true, items: ['Penicilina'] } }, hoy).ok).toBe(false);
  });

  it('rechaza alergias demasiado largas o de más', () => {
    expect(crearDatosDeSalud({ ...completos, alergias: { sinConocidas: false, items: ['x'.repeat(61)] } }, hoy).ok).toBe(false);
    const muchas = Array.from({ length: 31 }, (_, i) => `a${i}`);
    expect(crearDatosDeSalud({ ...completos, alergiasAMedicamentos: { sinConocidas: false, items: muchas } }, hoy).ok).toBe(false);
  });
});

describe('pendientes', () => {
  it('sin datos faltan los 5, en el orden de la pantalla', () => {
    expect(pendientesDeSalud(SIN_DATOS)).toEqual(['nacimiento', 'sexo', 'sangre', 'alergias', 'alergiasAMedicamentos']);
    expect(resumenDePendientes(SIN_DATOS)).toEqual({ total: 5, llenos: 0, faltan: 5, completo: false });
  });

  it('«ninguna conocida» cuenta como respondido; una lista vacía sin marcar, no', () => {
    expect(pendientesDeSalud({ ...completos, alergias: { sinConocidas: false, items: [] } })).toEqual(['alergias']);
    expect(pendientesDeSalud({ ...completos, alergias: { sinConocidas: true, items: [] } })).toEqual([]);
  });

  it('«No lo sé» en la sangre cuenta como respondido', () => {
    expect(pendientesDeSalud({ ...completos, tipoDeSangre: 'desconocido' })).toEqual([]);
  });

  it('con todo lleno está completo', () => {
    expect(resumenDePendientes(completos)).toEqual({ total: 5, llenos: 5, faltan: 0, completo: true });
  });

  it('cuenta lo que falta a medias', () => {
    expect(resumenDePendientes({ ...SIN_DATOS, nacimiento: '1990-03-14', sexo: 'mujer', tipoDeSangre: 'A+' })).toEqual({ total: 5, llenos: 3, faltan: 2, completo: false });
  });
});

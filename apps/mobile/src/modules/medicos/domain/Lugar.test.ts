import { describe, expect, it } from 'vitest';

import { claveDeLugar, crearLugar } from './Lugar';

describe('crearLugar', () => {
  it('crea un lugar con nombre libre', () => {
    const r = crearLugar({ id: 'l1', nombre: 'Hospital Morelos' });
    expect(r.ok && r.value).toEqual({ id: 'l1', nombre: 'Hospital Morelos' });
  });

  it('el nombre es obligatorio', () => {
    expect(crearLugar({ id: 'l1', nombre: '' }).ok).toBe(false);
    expect(crearLugar({ id: 'l1', nombre: '   ' }).ok).toBe(false);
  });

  it('recorta y junta los espacios del nombre', () => {
    const r = crearLugar({ id: 'l1', nombre: '  Clínica   del   Sureste ' });
    expect(r.ok && r.value.nombre).toBe('Clínica del Sureste');
  });

  it('rechaza nombres demasiado largos', () => {
    expect(crearLugar({ id: 'l1', nombre: 'x'.repeat(81) }).ok).toBe(false);
  });
});

describe('claveDeLugar (para no repetir lugares)', () => {
  it('ignora mayúsculas, acentos y espacios de más', () => {
    expect(claveDeLugar('Clínica del Sureste')).toBe(claveDeLugar('  clinica   DEL sureste '));
  });

  it('distingue lugares distintos', () => {
    expect(claveDeLugar('Hospital Morelos')).not.toBe(claveDeLugar('Hosp. Morelos'));
  });
});

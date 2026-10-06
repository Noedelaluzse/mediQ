import { describe, expect, it } from 'vitest';

import { DemasiadosMedicamentosError, MedicamentoInvalidoError } from './errors';
import { crearMedicamento, crearReceta, MAXIMO_DE_MEDICAMENTOS } from './Receta';

describe('crearMedicamento (RF-31)', () => {
  it('solo el nombre es obligatorio; lo demás queda sin valor', () => {
    const r = crearMedicamento({ nombre: '  Losartán ' });
    expect(r.ok && r.value).toEqual({ nombre: 'Losartán', dosis: undefined, frecuencia: undefined, duracion: undefined, via: undefined, indicaciones: undefined });
  });

  it('recorta los campos opcionales y trata los vacíos como ausentes', () => {
    const r = crearMedicamento({ nombre: 'Losartán', dosis: ' 50 mg ', frecuencia: '   ', duracion: '30 días', via: 'Oral', indicaciones: 'Con alimentos' });
    expect(r.ok && r.value).toEqual({ nombre: 'Losartán', dosis: '50 mg', frecuencia: undefined, duracion: '30 días', via: 'Oral', indicaciones: 'Con alimentos' });
  });

  it('rechaza un nombre vacío o de más de 80 caracteres', () => {
    expect(crearMedicamento({ nombre: '   ' }).ok).toBe(false);
    const largo = crearMedicamento({ nombre: 'x'.repeat(81) });
    expect(!largo.ok && largo.error).toBeInstanceOf(MedicamentoInvalidoError);
    expect(crearMedicamento({ nombre: 'x'.repeat(80) }).ok).toBe(true);
  });

  it('dosis, frecuencia, duración y vía admiten hasta 60 caracteres; indicaciones hasta 300', () => {
    for (const campo of ['dosis', 'frecuencia', 'duracion', 'via'] as const) {
      expect(crearMedicamento({ nombre: 'A', [campo]: 'x'.repeat(61) }).ok).toBe(false);
      expect(crearMedicamento({ nombre: 'A', [campo]: 'x'.repeat(60) }).ok).toBe(true);
    }
    expect(crearMedicamento({ nombre: 'A', indicaciones: 'x'.repeat(301) }).ok).toBe(false);
    expect(crearMedicamento({ nombre: 'A', indicaciones: 'x'.repeat(300) }).ok).toBe(true);
  });
});

describe('crearReceta', () => {
  it('acepta varios medicamentos y conserva el orden', () => {
    const r = crearReceta([{ nombre: 'Losartán' }, { nombre: 'Aspirina' }]);
    expect(r.ok && r.value.map((m) => m.nombre)).toEqual(['Losartán', 'Aspirina']);
  });

  it('acepta una lista vacía', () => {
    const r = crearReceta([]);
    expect(r.ok && r.value).toEqual([]);
  });

  it('un medicamento inválido invalida toda la receta', () => {
    const r = crearReceta([{ nombre: 'Losartán' }, { nombre: '' }]);
    expect(!r.ok && r.error).toBeInstanceOf(MedicamentoInvalidoError);
  });

  it(`no pasa de ${MAXIMO_DE_MEDICAMENTOS} medicamentos`, () => {
    const entradas = Array.from({ length: MAXIMO_DE_MEDICAMENTOS + 1 }, (_, n) => ({ nombre: `M${n}` }));
    const r = crearReceta(entradas);
    expect(!r.ok && r.error).toBeInstanceOf(DemasiadosMedicamentosError);
    expect(crearReceta(entradas.slice(0, MAXIMO_DE_MEDICAMENTOS)).ok).toBe(true);
  });
});

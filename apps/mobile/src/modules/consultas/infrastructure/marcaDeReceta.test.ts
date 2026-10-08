import { describe, expect, it } from 'vitest';

import { marcaAlGuardarConsulta } from './marcaDeReceta';

describe('marcaAlGuardarConsulta (AUD-13 / F060: la consulta nueva nace con hasPrescription)', () => {
  it('una consulta que no existía nace sin receta: false (el Perfil no tiene que ir a leer su receta)', () => {
    expect(marcaAlGuardarConsulta(null)).toEqual({ hasPrescription: false });
    expect(marcaAlGuardarConsulta(undefined)).toEqual({ hasPrescription: false });
  });

  it('reenviar una consulta que ya tenía receta NO baja la marca a false', () => {
    expect(marcaAlGuardarConsulta({ hasPrescription: true })).toEqual({ hasPrescription: true });
  });

  it('reenviar una consulta sin receta conserva el false', () => {
    expect(marcaAlGuardarConsulta({ hasPrescription: false })).toEqual({ hasPrescription: false });
  });

  it('una consulta anterior sin marca no se marca aquí: de rellenarla se encarga el Perfil, que sí lee su receta', () => {
    expect(marcaAlGuardarConsulta({})).toEqual({});
  });

  it('una marca con otro tipo (dato dañado) no se copia: cuenta como sin marca', () => {
    expect(marcaAlGuardarConsulta({ hasPrescription: 'sí' })).toEqual({});
    expect(marcaAlGuardarConsulta({ hasPrescription: 1 })).toEqual({});
  });
});

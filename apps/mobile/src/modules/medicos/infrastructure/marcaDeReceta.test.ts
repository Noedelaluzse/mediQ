import { describe, expect, it } from 'vitest';

import { marcaARellenar } from './marcaDeReceta';

describe('marcaARellenar (AUD-13 / F060: el relleno de consultas antiguas no pisa una marca más reciente)', () => {
  it('una consulta sin marca la recibe según tenga o no receta', () => {
    expect(marcaARellenar({}, true)).toEqual({ hasPrescription: true });
    expect(marcaARellenar({}, false)).toEqual({ hasPrescription: false });
  });

  it('si la marca apareció mientras se leía la receta (se guardó una receta), no se escribe nada', () => {
    expect(marcaARellenar({ hasPrescription: true }, false)).toBeNull();
    expect(marcaARellenar({ hasPrescription: false }, true)).toBeNull();
  });

  it('una marca con otro tipo (dato dañado) cuenta como sin marca y se corrige', () => {
    expect(marcaARellenar({ hasPrescription: 'sí' }, true)).toEqual({ hasPrescription: true });
  });
});

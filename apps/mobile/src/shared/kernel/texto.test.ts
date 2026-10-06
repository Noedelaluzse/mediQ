import { describe, expect, it } from 'vitest';

import { normalizarTexto } from './texto';

describe('normalizarTexto', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizarTexto('Dra. Mariana SOLÍS')).toBe('dra. mariana solis');
    expect(normalizarTexto('Cardiología')).toBe('cardiologia');
    expect(normalizarTexto('Peñón')).toBe('penon');
  });

  it('recorta y junta los espacios repetidos', () => {
    expect(normalizarTexto('  hospital   morelos \n')).toBe('hospital morelos');
  });

  it('un texto vacío queda vacío', () => {
    expect(normalizarTexto('')).toBe('');
    expect(normalizarTexto('   ')).toBe('');
  });
});

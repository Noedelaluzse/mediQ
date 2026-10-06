import { describe, expect, it } from 'vitest';

import { FotoInvalidaError } from './errors';
import { crearFotoDeReceta, LIMITE_DE_BYTES_DE_FOTO } from './FotoDeReceta';

describe('crearFotoDeReceta (RF-30)', () => {
  it('acepta un JPEG con su tamaño y dimensiones', () => {
    const r = crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: 400_000, ancho: 1200, alto: 1600 });
    expect(r.ok && r.value).toEqual({ tipoMime: 'image/jpeg', bytes: 400_000, ancho: 1200, alto: 1600 });
  });

  it('las dimensiones son opcionales', () => {
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: 10 }).ok).toBe(true);
  });

  it('rechaza lo que no es JPEG', () => {
    for (const tipoMime of ['image/png', 'application/pdf', '']) {
      const r = crearFotoDeReceta({ tipoMime, bytes: 10 });
      expect(!r.ok && r.error).toBeInstanceOf(FotoInvalidaError);
    }
  });

  it('rechaza un archivo vacío o de más de 5 MB', () => {
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: 0 }).ok).toBe(false);
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: LIMITE_DE_BYTES_DE_FOTO + 1 }).ok).toBe(false);
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: LIMITE_DE_BYTES_DE_FOTO }).ok).toBe(true);
  });

  it('rechaza dimensiones que no son enteros positivos', () => {
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: 10, ancho: 0, alto: 10 }).ok).toBe(false);
    expect(crearFotoDeReceta({ tipoMime: 'image/jpeg', bytes: 10, ancho: 10.5, alto: 10 }).ok).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { coincideConBusqueda } from './busqueda';
import type { Medico } from './Medico';

const solis: Medico = { id: '1', nombreCompleto: 'Dra. Mariana Solís', especialidad: 'cardiologia' };

describe('coincideConBusqueda', () => {
  it('una búsqueda vacía coincide con todos', () => {
    expect(coincideConBusqueda(solis, '')).toBe(true);
    expect(coincideConBusqueda(solis, '   ')).toBe(true);
  });

  it('busca por nombre sin distinguir mayúsculas ni acentos', () => {
    expect(coincideConBusqueda(solis, 'solis')).toBe(true);
    expect(coincideConBusqueda(solis, 'MARIANA')).toBe(true);
  });

  it('busca por nombre de la especialidad', () => {
    expect(coincideConBusqueda(solis, 'cardio')).toBe(true);
    expect(coincideConBusqueda(solis, 'cardiología')).toBe(true);
  });

  it('con varias palabras deben coincidir todas (nombre y especialidad juntos)', () => {
    expect(coincideConBusqueda(solis, 'solis cardiologia')).toBe(true);
    expect(coincideConBusqueda(solis, 'solis pediatria')).toBe(false);
  });

  it('no coincide con otra cosa', () => {
    expect(coincideConBusqueda(solis, 'pech')).toBe(false);
  });
});

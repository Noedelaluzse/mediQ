import { describe, expect, it } from 'vitest';

import { esFutura, type ProximaCita } from './ProximaCita';

const cita = (fecha: Date): ProximaCita => ({ consultaId: 'c1', fecha, especialidad: 'cardiologia' });

describe('esFutura (HU-09: solo la cita futura)', () => {
  const ahora = new Date(2026, 9, 5, 12, 0);

  it('una cita posterior a ahora es futura', () => {
    expect(esFutura(cita(new Date(2026, 9, 19, 10, 30)), ahora)).toBe(true);
    expect(esFutura(cita(new Date(2026, 9, 5, 12, 1)), ahora)).toBe(true);
  });

  it('una de este mismo instante o pasada ya no se muestra', () => {
    expect(esFutura(cita(ahora), ahora)).toBe(false);
    expect(esFutura(cita(new Date(2026, 9, 1)), ahora)).toBe(false);
  });
});

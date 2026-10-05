import { describe, expect, it } from 'vitest';

import type { ProximaCita } from '../domain/ProximaCita';
import { datosDeProximaCita } from './tarjetaDeProximaCita';

const cita: ProximaCita = {
  consultaId: 'c1',
  fecha: new Date(2026, 9, 19, 10, 30),
  especialidad: 'cardiologia',
  medicoNombre: 'Dra. Mariana Solís',
};

describe('datosDeProximaCita (canvas: OCT 19 · Seguimiento · Cardiología · Dra. Solís · 10:30)', () => {
  it('mes, día, título y detalle', () => {
    expect(datosDeProximaCita(cita)).toEqual({
      mes: 'OCT',
      dia: '19',
      titulo: 'Seguimiento · Cardiología',
      detalle: 'Dra. Mariana Solís · 10:30',
    });
  });

  it('sin médico el detalle es solo la hora', () => {
    expect(datosDeProximaCita({ ...cita, medicoNombre: undefined }).detalle).toBe('10:30');
  });

  it('el día no lleva cero a la izquierda', () => {
    expect(datosDeProximaCita({ ...cita, fecha: new Date(2026, 9, 2, 9, 5) })).toMatchObject({ dia: '2', detalle: 'Dra. Mariana Solís · 09:05' });
  });
});

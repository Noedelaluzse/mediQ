import { describe, expect, it } from 'vitest';

import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import { ObtenerProximaCita } from './ObtenerProximaCita';

const ahora = new Date(2026, 9, 5, 12, 0);
const cita = (id: string, fecha: Date): ProximaCita => ({ consultaId: id, fecha, especialidad: 'cardiologia' });
const repo = (citas: ProximaCita[]): ProximaCitaRepository => ({ posterioresA: async () => citas });

describe('ObtenerProximaCita (RF-16, HU-09)', () => {
  it('devuelve la cita futura más cercana', async () => {
    const r = await new ObtenerProximaCita(repo([cita('b', new Date(2026, 10, 2)), cita('a', new Date(2026, 9, 19))]), () => ahora).ejecutar();
    expect(r?.consultaId).toBe('a');
  });

  it('sin citas futuras no hay tarjeta', async () => {
    expect(await new ObtenerProximaCita(repo([]), () => ahora).ejecutar()).toBeNull();
  });

  it('descarta las que ya pasaron aunque el repositorio las traiga', async () => {
    const r = await new ObtenerProximaCita(repo([cita('vieja', new Date(2026, 9, 1)), cita('ok', new Date(2026, 9, 20))]), () => ahora).ejecutar();
    expect(r?.consultaId).toBe('ok');
  });

  it('pide las posteriores a este momento', async () => {
    let recibido: Date | undefined;
    const r: ProximaCitaRepository = { posterioresA: async (d) => ((recibido = d), []) };
    await new ObtenerProximaCita(r, () => ahora).ejecutar();
    expect(recibido).toEqual(ahora);
  });
});

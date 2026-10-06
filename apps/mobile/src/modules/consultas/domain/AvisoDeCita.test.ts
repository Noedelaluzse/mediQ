import { describe, expect, it } from 'vitest';

import { avisosDeCita, PREFIJO_DE_AVISOS } from './AvisoDeCita';
import type { ProximaCita } from './ProximaCita';

const cita = (extra: Partial<ProximaCita> = {}): ProximaCita => ({
  consultaId: 'c1',
  fecha: new Date(2026, 9, 19, 13, 9), // 19 oct 2026, 13:09 (hora local)
  especialidad: 'cardiologia',
  medicoNombre: 'Dra. Mariana Solís',
  ...extra,
});
const ahora = new Date(2026, 9, 6, 12, 0);

describe('avisosDeCita (RF-40)', () => {
  it('programa dos avisos: la víspera a las 9:00 y 2 horas antes de la cita', () => {
    const [vispera, dosHoras] = avisosDeCita(cita(), ahora);
    expect(vispera.cuando).toEqual(new Date(2026, 9, 18, 9, 0));
    expect(dosHoras.cuando).toEqual(new Date(2026, 9, 19, 11, 9));
  });

  it('los ids son estables por consulta (reprogramar reemplaza, no duplica) y llevan el prefijo común', () => {
    const [vispera, dosHoras] = avisosDeCita(cita(), ahora);
    expect(vispera.id).toBe(`${PREFIJO_DE_AVISOS}c1-vispera`);
    expect(dosHoras.id).toBe(`${PREFIJO_DE_AVISOS}c1-2h`);
    expect(vispera.consultaId).toBe('c1');
  });

  it('el texto dice especialidad, médico y hora (decisión del usuario)', () => {
    const [vispera, dosHoras] = avisosDeCita(cita(), ahora);
    expect(vispera.titulo).toBe('Cita mañana · Cardiología');
    expect(vispera.cuerpo).toBe('Dra. Mariana Solís · 13:09');
    expect(dosHoras.titulo).toBe('Cita en 2 horas · Cardiología');
    expect(dosHoras.cuerpo).toBe('Dra. Mariana Solís · 13:09');
  });

  it('sin médico, el cuerpo es solo la hora', () => {
    const [vispera] = avisosDeCita(cita({ medicoNombre: undefined }), ahora);
    expect(vispera.cuerpo).toBe('13:09');
  });

  it('si el aviso de la víspera ya pasó, solo queda el de 2 horas antes', () => {
    const r = avisosDeCita(cita(), new Date(2026, 9, 18, 10, 0));
    expect(r.map((a) => a.id)).toEqual([`${PREFIJO_DE_AVISOS}c1-2h`]);
  });

  it('si faltan menos de 2 horas, no se programa ninguno', () => {
    expect(avisosDeCita(cita(), new Date(2026, 9, 19, 12, 0))).toEqual([]);
  });

  it('una cita pasada no genera avisos', () => {
    expect(avisosDeCita(cita(), new Date(2026, 9, 25))).toEqual([]);
  });

  it('una cita temprano (7:30) tiene su aviso la víspera a las 9:00 y el de 2 horas a las 5:30', () => {
    const [vispera, dosHoras] = avisosDeCita(cita({ fecha: new Date(2026, 9, 19, 7, 30) }), ahora);
    expect(vispera.cuando).toEqual(new Date(2026, 9, 18, 9, 0));
    expect(dosHoras.cuando).toEqual(new Date(2026, 9, 19, 5, 30));
  });

  it('el aviso exactamente en este momento ya no cuenta (debe ser futuro)', () => {
    expect(avisosDeCita(cita(), new Date(2026, 9, 19, 11, 9))).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { crearConsulta, type DatosDeConsulta } from './Consulta';
import { FechaFuturaError, LugarInvalidoError, ProximaCitaInvalidaError, TipoDeMedicoInvalidoError } from './errors';
import { TIPOS_DE_MEDICO } from './TipoDeMedico';

const ahora = new Date(2026, 9, 5, 12, 0);
const base: DatosDeConsulta = {
  id: 'c1',
  fecha: new Date(2026, 9, 4, 9, 30),
  tipo: 'especialista',
  especialidad: 'cardiologia',
};

describe('crearConsulta (RF-10, HU-02)', () => {
  it('crea una consulta con solo fecha, tipo y especialidad', () => {
    const r = crearConsulta(base, ahora);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ id: 'c1', pacienteId: 'self', modo: 'presencial', tipo: 'especialista', especialidad: 'cardiologia' });
      expect(r.value.medico).toBeUndefined();
      expect(r.value.lugar).toBeUndefined();
    }
  });

  it('la fecha no puede ser futura', () => {
    const r = crearConsulta({ ...base, fecha: new Date(2026, 9, 5, 12, 1) }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(FechaFuturaError);
  });

  it('una consulta de este mismo momento sí se acepta', () => {
    expect(crearConsulta({ ...base, fecha: ahora }, ahora).ok).toBe(true);
  });

  it('el tipo de médico es obligatorio y debe ser uno del catálogo', () => {
    expect(TIPOS_DE_MEDICO.map((t) => t.valor)).toEqual(['general', 'especialista', 'dentista', 'urgencias', 'otro']);
    const r = crearConsulta({ ...base, tipo: 'inventado' }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(TipoDeMedicoInvalidoError);
  });

  it('rechaza una especialidad que no está en el catálogo', () => {
    expect(crearConsulta({ ...base, especialidad: 'inventada' }, ahora).ok).toBe(false);
  });

  it('la próxima cita debe ser posterior a la consulta', () => {
    const antes = crearConsulta({ ...base, proximaCita: new Date(2026, 9, 4, 9, 30) }, ahora);
    expect(!antes.ok && antes.error).toBeInstanceOf(ProximaCitaInvalidaError);
    expect(crearConsulta({ ...base, proximaCita: new Date(2026, 9, 19, 10, 30) }, ahora).ok).toBe(true);
  });

  it('la próxima cita sí puede estar en el futuro', () => {
    const r = crearConsulta({ ...base, proximaCita: new Date(2027, 0, 1) }, ahora);
    expect(r.ok && r.value.proximaCita).toEqual(new Date(2027, 0, 1));
  });

  it('recorta los textos y deja vacíos los que vienen en blanco', () => {
    const r = crearConsulta({ ...base, consultorio: '  204 ', motivo: '   ', indicaciones: '  Bajar la sal \n' }, ahora);
    expect(r.ok && r.value).toMatchObject({ consultorio: '204', motivo: undefined, indicaciones: 'Bajar la sal' });
  });

  it('conserva el médico y el lugar con su id', () => {
    const r = crearConsulta({ ...base, medico: { id: 'm1', nombre: 'Dra. Solís' }, lugar: { id: 'l1', nombre: 'Clínica' } }, ahora);
    expect(r.ok && r.value).toMatchObject({ medico: { id: 'm1', nombre: 'Dra. Solís' }, lugar: { id: 'l1', nombre: 'Clínica' } });
  });

  it('lo que dijo el médico es texto libre sin límite práctico (HU-03)', () => {
    const largo = 'indicación '.repeat(2000);
    const r = crearConsulta({ ...base, indicaciones: largo }, ahora);
    expect(r.ok && r.value.indicaciones?.length).toBe(largo.trim().length);
  });

  it('el nombre del lugar no puede pasar de 80 caracteres', () => {
    const r = crearConsulta({ ...base, lugar: { id: 'l1', nombre: 'x'.repeat(81) } }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(LugarInvalidoError);
  });
});

import { describe, expect, it } from 'vitest';

import { crearConsulta, type DatosDeConsulta } from './Consulta';
import { DemasiadasIndicacionesError, FechaFuturaError, LugarInvalidoError, ProximaCitaInvalidaError } from './errors';

const ahora = new Date(2026, 9, 5, 12, 0);
const base: DatosDeConsulta = {
  id: 'c1',
  fecha: new Date(2026, 9, 4, 9, 30),
  especialidad: 'cardiologia',
};

describe('crearConsulta (RF-10, HU-02)', () => {
  it('crea una consulta con solo fecha y especialidad', () => {
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

  it('el tipo guardado se deduce de la especialidad (ya no se pregunta)', () => {
    const tipo = (especialidad: string) => {
      const r = crearConsulta({ ...base, especialidad }, ahora);
      return r.ok ? r.value.tipo : undefined;
    };
    expect(tipo('cardiologia')).toBe('especialista');
    expect(tipo('medicina-general')).toBe('general');
    expect(tipo('odontologia')).toBe('dentista');
    expect(tipo('urgencias')).toBe('urgencias');
    expect(tipo('otra')).toBe('otro');
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
    const r = crearConsulta({ ...base, consultorio: '  204 ', motivo: '   ', notasDelMedico: '  Bajar la sal \n' }, ahora);
    expect(r.ok && r.value).toMatchObject({ consultorio: '204', motivo: undefined, notasDelMedico: 'Bajar la sal' });
  });

  it('conserva el médico y el lugar con su id', () => {
    const r = crearConsulta({ ...base, medico: { id: 'm1', nombre: 'Dra. Solís' }, lugar: { id: 'l1', nombre: 'Clínica' } }, ahora);
    expect(r.ok && r.value).toMatchObject({ medico: { id: 'm1', nombre: 'Dra. Solís' }, lugar: { id: 'l1', nombre: 'Clínica' } });
  });

  it('lo que dijo el médico es texto libre sin límite práctico (HU-03)', () => {
    const largo = 'indicación '.repeat(2000);
    const r = crearConsulta({ ...base, notasDelMedico: largo }, ahora);
    expect(r.ok && r.value.notasDelMedico?.length).toBe(largo.trim().length);
  });

  it('el nombre del lugar no puede pasar de 80 caracteres', () => {
    const r = crearConsulta({ ...base, lugar: { id: 'l1', nombre: 'x'.repeat(81) } }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(LugarInvalidoError);
  });

  it('sin indicaciones la lista queda vacía', () => {
    const r = crearConsulta(base, ahora);
    expect(r.ok && r.value.indicaciones).toEqual([]);
  });

  it('conserva las indicaciones en su orden', () => {
    const indicaciones = [
      { id: 'a', texto: 'Medir la presión', orden: 0 },
      { id: 'b', texto: 'Análisis en ayunas', orden: 1 },
    ];
    const r = crearConsulta({ ...base, indicaciones }, ahora);
    expect(r.ok && r.value.indicaciones).toEqual(indicaciones);
  });

  it('no acepta más de 30 indicaciones', () => {
    const muchas = Array.from({ length: 31 }, (_, n) => ({ id: String(n), texto: `i${n}`, orden: n }));
    const r = crearConsulta({ ...base, indicaciones: muchas }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(DemasiadasIndicacionesError);
  });
});

import { describe, expect, it } from 'vitest';

import type { ConsultaDelDiario } from './Diario';
import { buscarConsultas, textoBuscable } from './BusquedaDeConsultas';

const consulta = (id: string, extra: Partial<ConsultaDelDiario> = {}): ConsultaDelDiario => ({
  id,
  fecha: new Date(2026, 9, 5),
  especialidad: 'medicina-general',
  tipo: 'general',
  ...extra,
});

const solis = consulta('a', { especialidad: 'cardiologia', medicoNombre: 'Dra. Mariana Solís', lugar: 'Hospital Morelos', motivo: 'Dolor de panza' });
const perez = consulta('b', { especialidad: 'dermatologia', medicoNombre: 'Dr. Luis Pérez', lugar: 'Clínica del Sol' });
const sinMedico = consulta('c', { especialidad: 'odontologia' });
const todas = [solis, perez, sinMedico];

describe('buscarConsultas (RF-17)', () => {
  it('por médico, sin importar acentos ni mayúsculas', () => {
    expect(buscarConsultas(todas, 'solis').map((c) => c.id)).toEqual(['a']);
    expect(buscarConsultas(todas, 'MARIANA').map((c) => c.id)).toEqual(['a']);
    expect(buscarConsultas(todas, 'perez').map((c) => c.id)).toEqual(['b']);
  });

  it('por especialidad usando su nombre visible, también con parte de la palabra', () => {
    expect(buscarConsultas(todas, 'cardio').map((c) => c.id)).toEqual(['a']);
    expect(buscarConsultas(todas, 'Dermatología').map((c) => c.id)).toEqual(['b']);
    expect(buscarConsultas(todas, 'odonto').map((c) => c.id)).toEqual(['c']);
  });

  it('por lugar', () => {
    expect(buscarConsultas(todas, 'morelos').map((c) => c.id)).toEqual(['a']);
    expect(buscarConsultas(todas, 'clinica').map((c) => c.id)).toEqual(['b']);
  });

  it('con varias palabras deben aparecer todas, aunque estén en campos distintos', () => {
    expect(buscarConsultas(todas, 'solis cardio').map((c) => c.id)).toEqual(['a']);
    expect(buscarConsultas(todas, 'solis derma')).toEqual([]);
    expect(buscarConsultas(todas, '  mariana   morelos ').map((c) => c.id)).toEqual(['a']);
  });

  it('una consulta sin médico ni lugar sigue encontrándose por su especialidad', () => {
    expect(buscarConsultas(todas, 'odontologia')).toHaveLength(1);
  });

  it('no busca en el motivo ni en lo que dijo el médico (decisión del usuario: solo médico, especialidad y lugar)', () => {
    expect(buscarConsultas(todas, 'panza')).toEqual([]);
  });

  it('sin texto devuelve todo en el mismo orden; sin coincidencias, nada', () => {
    expect(buscarConsultas(todas, '')).toEqual(todas);
    expect(buscarConsultas(todas, '   ')).toEqual(todas);
    expect(buscarConsultas(todas, 'zzz')).toEqual([]);
  });

  it('conserva el orden recibido (más reciente primero)', () => {
    const dos = [consulta('x', { medicoNombre: 'Ana' }), consulta('y', { medicoNombre: 'Ana María' })];
    expect(buscarConsultas(dos, 'ana').map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('textoBuscable junta médico, especialidad y lugar ya normalizados', () => {
    expect(textoBuscable(solis)).toBe('dra. mariana solis cardiologia hospital morelos');
    expect(textoBuscable(sinMedico)).toBe('odontologia');
  });
});

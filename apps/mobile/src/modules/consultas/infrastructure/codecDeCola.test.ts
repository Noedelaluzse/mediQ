import { describe, expect, it } from 'vitest';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import { colaDeTexto, colaATexto } from './codecDeCola';

const completa: ConsultaPendiente = {
  id: 'c1',
  entrada: {
    fecha: new Date(2026, 9, 4, 9, 30),
    especialidad: 'cardiologia',
    lugar: 'Clínica del Sureste',
    consultorio: '204',
    medicoId: 'm1',
    medicoNombre: 'Dra. Solís',
    medicoTelefono: '998 555 0142',
    motivo: 'Revisión',
    notasDelMedico: 'Bajar la sal',
    indicaciones: ['Medir la presión', 'Reposo'],
    proximaCita: new Date(2026, 10, 15, 11, 0),
  },
  creadaEn: new Date(2026, 9, 5, 12, 0),
  intentos: 2,
  error: 'motivo',
};
const minima: ConsultaPendiente = { id: 'c2', entrada: { fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'medicina-general' }, creadaEn: new Date(2026, 9, 5, 13, 0), intentos: 0 };

describe('codecDeCola (las fechas viajan como texto y vuelven como fechas)', () => {
  it('ida y vuelta sin perder nada, con todos los campos', () => {
    expect(colaDeTexto(colaATexto([completa, minima]))).toEqual([completa, minima]);
  });

  it('una lista vacía y un texto vacío son una cola vacía', () => {
    expect(colaDeTexto(colaATexto([]))).toEqual([]);
    expect(colaDeTexto('')).toEqual([]);
  });

  it('un contenido dañado se trata como cola vacía (no rompe la app)', () => {
    expect(colaDeTexto('{no es json')).toEqual([]);
    expect(colaDeTexto('{"a":1}')).toEqual([]);
  });

  it('un elemento dañado se descarta y los buenos se conservan', () => {
    const texto = JSON.stringify([JSON.parse(colaATexto([minima]))[0], { id: 5 }, { id: 'x', entrada: { fecha: 'no es fecha', especialidad: 'a' }, creadaEn: 'ayer', intentos: 0 }]);
    expect(colaDeTexto(texto)).toEqual([minima]);
  });
});

import { describe, expect, it } from 'vitest';

import type { Consulta } from '../domain/Consulta';
import type { Indicacion } from '../domain/Indicacion';
import { conIndicacionAlternada, datosDelEncabezado, lineaDelLugar } from './detalleDeConsulta';

const consulta = (extra: Partial<Consulta> = {}): Consulta => ({
  id: 'c1',
  pacienteId: 'self',
  modo: 'presencial',
  tipo: 'especialista',
  especialidad: 'cardiologia',
  fecha: new Date(2026, 8, 28, 11, 0),
  indicaciones: [],
  ...extra,
});

describe('datosDelEncabezado (canvas: fecha larga, título y chips)', () => {
  it('fecha y hora larga, título = motivo y chips de especialidad y modo', () => {
    expect(datosDelEncabezado(consulta({ motivo: 'Revisión de presión arterial' }))).toEqual({
      fecha: 'Lunes 28 de septiembre de 2026 · 11:00',
      titulo: 'Revisión de presión arterial',
      chips: ['Cardiología', 'Presencial'],
    });
  });

  it('sin motivo el título es "Consulta"', () => {
    expect(datosDelEncabezado(consulta()).titulo).toBe('Consulta');
  });
});

describe('lineaDelLugar ("Clínica del Sureste · Consultorio 204")', () => {
  it('lugar y consultorio', () => {
    expect(lineaDelLugar(consulta({ lugar: { id: 'l', nombre: 'Clínica del Sureste' }, consultorio: '204' }))).toBe('Clínica del Sureste · Consultorio 204');
  });
  it('solo lugar o solo consultorio', () => {
    expect(lineaDelLugar(consulta({ lugar: { id: 'l', nombre: 'Hospital Morelos' } }))).toBe('Hospital Morelos');
    expect(lineaDelLugar(consulta({ consultorio: '204' }))).toBe('Consultorio 204');
  });
  it('sin ninguno, nada', () => {
    expect(lineaDelLugar(consulta())).toBeUndefined();
  });
});

describe('conIndicacionAlternada (marcar al instante en pantalla)', () => {
  const lista: Indicacion[] = [
    { id: 'a', texto: 'uno', orden: 0 },
    { id: 'b', texto: 'dos', orden: 1, hechaEn: new Date(2026, 9, 1) },
  ];
  const hoy = new Date(2026, 9, 5);

  it('marca una pendiente con la fecha de hoy y deja las demás', () => {
    const r = conIndicacionAlternada(lista, 'a', hoy);
    expect(r[0].hechaEn).toEqual(hoy);
    expect(r[1]).toBe(lista[1]);
  });

  it('desmarca una hecha', () => {
    expect(conIndicacionAlternada(lista, 'b', hoy)[1].hechaEn).toBeUndefined();
  });

  it('un id desconocido no cambia nada', () => {
    expect(conIndicacionAlternada(lista, 'z', hoy)).toEqual(lista);
  });
});

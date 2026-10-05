import { describe, expect, it } from 'vitest';

import type { ConsultaDelDiario } from '../domain/Diario';
import { datosDeTarjeta, textoDeTotal } from './tarjetaDelDiario';

const base: ConsultaDelDiario = { id: 'v1', fecha: new Date(2026, 8, 2, 10, 0), especialidad: 'odontologia', tipo: 'dentista' };

describe('datosDeTarjeta (HU-07: día, especialidad, médico y resumen)', () => {
  it('día con dos dígitos, día de la semana y nombre de la especialidad', () => {
    expect(datosDeTarjeta(base)).toMatchObject({ dia: '02', diaDeLaSemana: 'mié', especialidad: 'Odontología' });
    expect(datosDeTarjeta({ ...base, fecha: new Date(2026, 8, 28) }).dia).toBe('28');
  });

  it('con médico: el título es el médico y el resumen las notas', () => {
    const t = datosDeTarjeta({ ...base, medicoNombre: 'Dra. Ana Canul', motivo: 'Limpieza', notasDelMedico: 'Todo bien. Regresar en marzo.' });
    expect(t).toMatchObject({ titulo: 'Dra. Ana Canul', resumen: 'Todo bien. Regresar en marzo.' });
  });

  it('con médico y sin notas, el resumen es el motivo', () => {
    expect(datosDeTarjeta({ ...base, medicoNombre: 'Dra. Ana Canul', motivo: 'Limpieza' }).resumen).toBe('Limpieza');
  });

  it('sin médico: el título es el motivo y el resumen las notas', () => {
    const t = datosDeTarjeta({ ...base, motivo: 'Dolor de muela', notasDelMedico: 'Tomar analgésico.' });
    expect(t).toMatchObject({ titulo: 'Dolor de muela', resumen: 'Tomar analgésico.' });
  });

  it('sin médico ni motivo el título es "Consulta"', () => {
    expect(datosDeTarjeta(base)).toMatchObject({ titulo: 'Consulta', resumen: undefined });
  });
});

describe('textoDeTotal (encabezado de cada mes)', () => {
  it('singular y plural', () => {
    expect(textoDeTotal(1)).toBe('1 consulta');
    expect(textoDeTotal(3)).toBe('3 consultas');
  });
});

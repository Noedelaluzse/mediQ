import { describe, expect, it } from 'vitest';

import { DatosDeMedicoIncompletosError, FechaFuturaError, IndicacionInvalidaError } from '../domain/errors';
import type { EntradaRegistrarConsulta } from './prepararConsulta';
import { validarEntradaDeConsulta } from './validarConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);
const base: EntradaRegistrarConsulta = { fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'cardiologia' };

describe('validarEntradaDeConsulta (sin tocar la red: sirve para guardar sin internet)', () => {
  it('acepta una consulta mínima y una completa', () => {
    expect(validarEntradaDeConsulta(base, ahora).ok).toBe(true);
    expect(validarEntradaDeConsulta({ ...base, lugar: 'Clínica', medicoNombre: 'Dra. Solís', medicoTelefono: '998 555 0142', indicaciones: ['Reposo'], proximaCita: new Date(2026, 10, 1) }, ahora).ok).toBe(true);
  });

  it('rechaza una fecha futura', () => {
    const r = validarEntradaDeConsulta({ ...base, fecha: new Date(2026, 9, 6) }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(FechaFuturaError);
  });

  it('rechaza teléfono o cédula sin nombre de médico', () => {
    const r = validarEntradaDeConsulta({ ...base, medicoTelefono: '998' }, ahora);
    expect(!r.ok && r.error).toBeInstanceOf(DatosDeMedicoIncompletosError);
  });

  it('rechaza una indicación demasiado larga y se ignoran las vacías', () => {
    const larga = validarEntradaDeConsulta({ ...base, indicaciones: ['x'.repeat(301)] }, ahora);
    expect(!larga.ok && larga.error).toBeInstanceOf(IndicacionInvalidaError);
    expect(validarEntradaDeConsulta({ ...base, indicaciones: ['  ', ''] }, ahora).ok).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { DomainError } from '@/shared/kernel/DomainError';
import { err, ok, type Result } from '@/shared/kernel/Result';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError, DatosDeMedicoIncompletosError, FechaFuturaError } from '../domain/errors';
import type { LugaresParaConsulta, MedicosParaConsulta, ReferenciaGuardada } from '../domain/puertos';
import { EditarConsulta } from './EditarConsulta';
import type { EntradaRegistrarConsulta } from './RegistrarConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);

const existente: Consulta = {
  id: 'c1',
  pacienteId: 'self',
  modo: 'presencial',
  tipo: 'general',
  especialidad: 'medicina-general',
  fecha: new Date(2026, 9, 1, 9, 0),
  motivo: 'Gripa',
  indicaciones: [],
};

class Consultas implements ConsultaRepository {
  actualizadas: Consulta[] = [];
  async guardar() {}
  async actualizar(c: Consulta) {
    this.actualizadas.push(c);
  }
  async eliminar() {}
}
class Medicos implements MedicosParaConsulta {
  llamadas: Parameters<MedicosParaConsulta['asegurar']>[0][] = [];
  resultado: Result<ReferenciaGuardada, DomainError> | null = null;
  async asegurar(d: Parameters<MedicosParaConsulta['asegurar']>[0]) {
    this.llamadas.push(d);
    return this.resultado ?? ok({ id: d.medicoId ?? 'm-nuevo', nombre: d.nombre });
  }
}
class Lugares implements LugaresParaConsulta {
  llamadas: string[] = [];
  async asegurar(nombre: string) {
    this.llamadas.push(nombre);
    return ok({ id: 'l-1', nombre });
  }
}

const montar = (actual: Consulta | null = existente) => {
  const consultas = new Consultas();
  const medicos = new Medicos();
  const lugares = new Lugares();
  const detalle: DetalleDeConsultaRepository = { obtener: async () => actual };
  return { consultas, medicos, lugares, uc: new EditarConsulta(consultas, detalle, medicos, lugares, () => ahora) };
};

const cambios: EntradaRegistrarConsulta = { fecha: new Date(2026, 9, 2, 10, 30), tipo: 'especialista', especialidad: 'cardiologia', motivo: 'Revisión de presión' };

describe('EditarConsulta (CU-06)', () => {
  it('actualiza la consulta conservando su id', async () => {
    const { consultas, uc } = montar();
    const r = await uc.ejecutar('c1', cambios);
    expect(r.ok && r.value).toMatchObject({ id: 'c1', tipo: 'especialista', especialidad: 'cardiologia', motivo: 'Revisión de presión' });
    expect(consultas.actualizadas).toHaveLength(1);
    expect(consultas.actualizadas[0].fecha).toEqual(new Date(2026, 9, 2, 10, 30));
  });

  it('un campo opcional vaciado queda sin valor', async () => {
    const { consultas, uc } = montar();
    await uc.ejecutar('c1', { ...cambios, motivo: '   ', lugar: '', consultorio: '' });
    expect(consultas.actualizadas[0]).toMatchObject({ motivo: undefined, lugar: undefined, consultorio: undefined });
  });

  it('una consulta que no existe devuelve ConsultaNoEncontradaError y no guarda nada', async () => {
    const { consultas, uc } = montar(null);
    const r = await uc.ejecutar('x', cambios);
    expect(!r.ok && r.error).toBeInstanceOf(ConsultaNoEncontradaError);
    expect(consultas.actualizadas).toEqual([]);
  });

  it('las mismas validaciones que al registrar: fecha futura', async () => {
    const { consultas, medicos, lugares, uc } = montar();
    const r = await uc.ejecutar('c1', { ...cambios, fecha: new Date(2026, 9, 6), lugar: 'Clínica', medicoNombre: 'Dra. X' });
    expect(!r.ok && r.error).toBeInstanceOf(FechaFuturaError);
    expect(consultas.actualizadas).toEqual([]);
    expect(medicos.llamadas).toEqual([]);
    expect(lugares.llamadas).toEqual([]);
  });

  it('teléfono sin nombre de médico se rechaza', async () => {
    const { uc } = montar();
    const r = await uc.ejecutar('c1', { ...cambios, medicoTelefono: '998' });
    expect(!r.ok && r.error).toBeInstanceOf(DatosDeMedicoIncompletosError);
  });

  it('el médico elegido conserva su id y un lugar nuevo se guarda', async () => {
    const { consultas, medicos, lugares, uc } = montar();
    await uc.ejecutar('c1', { ...cambios, medicoId: 'm-7', medicoNombre: 'Dra. Solís', lugar: 'Hospital Morelos' });
    expect(medicos.llamadas[0].medicoId).toBe('m-7');
    expect(lugares.llamadas).toEqual(['Hospital Morelos']);
    expect(consultas.actualizadas[0]).toMatchObject({ medico: { id: 'm-7' }, lugar: { id: 'l-1', nombre: 'Hospital Morelos' } });
  });

  it('si no se puede guardar al médico, no se actualiza la consulta', async () => {
    const { consultas, medicos, uc } = montar();
    medicos.resultado = err(new DomainError('falló'));
    const r = await uc.ejecutar('c1', { ...cambios, medicoNombre: 'Dra. X' });
    expect(r.ok).toBe(false);
    expect(consultas.actualizadas).toEqual([]);
  });
});

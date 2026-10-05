import { describe, expect, it } from 'vitest';

import { DomainError } from '@/shared/kernel/DomainError';
import { err, ok, type Result } from '@/shared/kernel/Result';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import { DatosDeMedicoIncompletosError, FechaFuturaError, IndicacionInvalidaError } from '../domain/errors';
import type { LugaresParaConsulta, MedicosParaConsulta, ReferenciaGuardada } from '../domain/puertos';
import { RegistrarConsulta, type EntradaRegistrarConsulta } from './RegistrarConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);

class Consultas implements ConsultaRepository {
  guardadas: Consulta[] = [];
  async guardar(c: Consulta) {
    this.guardadas.push(c);
  }
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

const montar = (generarId: () => string = () => 'c-1') => {
  const consultas = new Consultas();
  const medicos = new Medicos();
  const lugares = new Lugares();
  const uc = new RegistrarConsulta(consultas, medicos, lugares, generarId, () => ahora);
  return { consultas, medicos, lugares, uc };
};

const base: EntradaRegistrarConsulta = { fecha: new Date(2026, 9, 4, 9, 30), tipo: 'especialista', especialidad: 'cardiologia' };

describe('RegistrarConsulta (CU-02)', () => {
  it('guarda una consulta mínima sin crear médico ni lugar', async () => {
    const { consultas, medicos, lugares, uc } = montar();
    const r = await uc.ejecutar(base);
    expect(r.ok && r.value.id).toBe('c-1');
    expect(consultas.guardadas).toHaveLength(1);
    expect(medicos.llamadas).toEqual([]);
    expect(lugares.llamadas).toEqual([]);
  });

  it('un lugar escrito se guarda como lugar y la consulta lo referencia', async () => {
    const { consultas, lugares, uc } = montar();
    await uc.ejecutar({ ...base, lugar: '  Clínica del Sureste ', consultorio: '204' });
    expect(lugares.llamadas).toEqual(['Clínica del Sureste']);
    expect(consultas.guardadas[0]).toMatchObject({ lugar: { id: 'l-1', nombre: 'Clínica del Sureste' }, consultorio: '204' });
  });

  it('un médico nuevo se guarda en el directorio con la especialidad de la consulta', async () => {
    const { consultas, medicos, uc } = montar();
    await uc.ejecutar({ ...base, medicoNombre: 'Dra. Mariana Solís', medicoTelefono: '998 555 0142' });
    expect(medicos.llamadas).toEqual([
      { medicoId: undefined, nombre: 'Dra. Mariana Solís', especialidad: 'cardiologia', telefono: '998 555 0142', cedula: undefined },
    ]);
    expect(consultas.guardadas[0].medico).toEqual({ id: 'm-nuevo', nombre: 'Dra. Mariana Solís' });
  });

  it('un médico elegido de los guardados conserva su id (no se duplica)', async () => {
    const { consultas, medicos, uc } = montar();
    await uc.ejecutar({ ...base, medicoId: 'm-7', medicoNombre: 'Dra. Mariana Solís' });
    expect(medicos.llamadas[0].medicoId).toBe('m-7');
    expect(consultas.guardadas[0].medico?.id).toBe('m-7');
  });

  it('con datos inválidos no guarda nada ni crea médicos o lugares', async () => {
    const { consultas, medicos, lugares, uc } = montar();
    const r = await uc.ejecutar({ ...base, fecha: new Date(2026, 9, 6), lugar: 'Clínica', medicoNombre: 'Dra. X' });
    expect(!r.ok && r.error).toBeInstanceOf(FechaFuturaError);
    expect(consultas.guardadas).toEqual([]);
    expect(medicos.llamadas).toEqual([]);
    expect(lugares.llamadas).toEqual([]);
  });

  it('teléfono o cédula sin nombre de médico se rechazan en vez de perderse', async () => {
    const { consultas, uc } = montar();
    const r = await uc.ejecutar({ ...base, medicoTelefono: '998 555 0142' });
    expect(!r.ok && r.error).toBeInstanceOf(DatosDeMedicoIncompletosError);
    expect(consultas.guardadas).toEqual([]);
  });

  it('si no se puede guardar al médico, no se guarda la consulta', async () => {
    const { consultas, medicos, uc } = montar();
    medicos.resultado = err(new DomainError('falló'));
    const r = await uc.ejecutar({ ...base, medicoNombre: 'Dra. X' });
    expect(r.ok).toBe(false);
    expect(consultas.guardadas).toEqual([]);
  });

  describe('indicaciones (RF-15)', () => {
    const contador = () => {
      let n = 0;
      return () => `id-${++n}`;
    };

    it('guarda la lista en orden, sin las vacías, cada una con su id', async () => {
      const { consultas, uc } = montar(contador());
      await uc.ejecutar({ ...base, indicaciones: ['  Medir la presión ', '', 'Análisis en ayunas', '   '] });
      const guardada = consultas.guardadas[0];
      expect(guardada.indicaciones.map((i) => [i.texto, i.orden])).toEqual([
        ['Medir la presión', 0],
        ['Análisis en ayunas', 1],
      ]);
      expect(new Set(guardada.indicaciones.map((i) => i.id)).size).toBe(2);
      expect(guardada.indicaciones.every((i) => i.hechaEn === undefined)).toBe(true);
    });

    it('sin indicaciones guarda la lista vacía', async () => {
      const { consultas, uc } = montar();
      await uc.ejecutar(base);
      expect(consultas.guardadas[0].indicaciones).toEqual([]);
    });

    it('una indicación demasiado larga rechaza todo antes de guardar nada', async () => {
      const { consultas, lugares, uc } = montar();
      const r = await uc.ejecutar({ ...base, lugar: 'Clínica', indicaciones: ['x'.repeat(301)] });
      expect(!r.ok && r.error).toBeInstanceOf(IndicacionInvalidaError);
      expect(consultas.guardadas).toEqual([]);
      expect(lugares.llamadas).toEqual([]);
    });
  });
});

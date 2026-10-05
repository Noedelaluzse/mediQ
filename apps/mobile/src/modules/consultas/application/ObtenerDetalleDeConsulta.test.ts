import { describe, expect, it } from 'vitest';

import type { Consulta } from '../domain/Consulta';
import type { ContactoDeMedico } from '../domain/ContactoDeMedico';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import type { Indicacion } from '../domain/Indicacion';
import type { IndicacionesRepository } from '../domain/IndicacionesRepository';
import { ObtenerDetalleDeConsulta } from './ObtenerDetalleDeConsulta';

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

const repo = (c: Consulta | null): DetalleDeConsultaRepository => ({ obtener: async () => c });
const indicaciones = (lista: Indicacion[]): IndicacionesRepository => ({
  listar: async () => lista,
  guardar: async () => {},
  quitar: async () => {},
});
const contacto = (tel?: string): ContactoDeMedico => ({ telefonoDe: async () => tel });

describe('ObtenerDetalleDeConsulta (CU-05)', () => {
  it('una consulta que no existe devuelve null', async () => {
    const r = await new ObtenerDetalleDeConsulta(repo(null), indicaciones([]), contacto()).ejecutar('x');
    expect(r).toBeNull();
  });

  it('trae la consulta con sus indicaciones ordenadas', async () => {
    const lista: Indicacion[] = [
      { id: 'b', texto: 'Análisis', orden: 1 },
      { id: 'a', texto: 'Medir la presión', orden: 0, hechaEn: new Date() },
    ];
    const r = await new ObtenerDetalleDeConsulta(repo(consulta()), indicaciones(lista), contacto()).ejecutar('c1');
    expect(r?.consulta.id).toBe('c1');
    expect(r?.indicaciones.map((i) => i.texto)).toEqual(['Medir la presión', 'Análisis']);
  });

  it('con médico guardado agrega su teléfono', async () => {
    const c = consulta({ medico: { id: 'm1', nombre: 'Dra. Solís' } });
    const r = await new ObtenerDetalleDeConsulta(repo(c), indicaciones([]), contacto('998 555 0142')).ejecutar('c1');
    expect(r?.telefonoDelMedico).toBe('998 555 0142');
  });

  it('sin médico no hay teléfono', async () => {
    const r = await new ObtenerDetalleDeConsulta(repo(consulta()), indicaciones([]), contacto('123')).ejecutar('c1');
    expect(r?.telefonoDelMedico).toBeUndefined();
  });

  it('si falla buscar el teléfono, el detalle se muestra igual', async () => {
    const roto: ContactoDeMedico = { telefonoDe: async () => Promise.reject(new Error('sin red')) };
    const c = consulta({ medico: { id: 'm1', nombre: 'Dra. Solís' } });
    const r = await new ObtenerDetalleDeConsulta(repo(c), indicaciones([]), roto).ejecutar('c1');
    expect(r?.consulta.id).toBe('c1');
    expect(r?.telefonoDelMedico).toBeUndefined();
  });
});

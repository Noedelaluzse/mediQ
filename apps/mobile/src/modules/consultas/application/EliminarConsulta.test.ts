import { describe, expect, it } from 'vitest';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError } from '../domain/errors';
import { EliminarConsulta } from './EliminarConsulta';

const existente: Consulta = { id: 'c1', pacienteId: 'self', modo: 'presencial', tipo: 'general', especialidad: 'otra', fecha: new Date(2026, 9, 1), indicaciones: [] };

describe('EliminarConsulta (CU-06)', () => {
  it('elimina una consulta existente', async () => {
    const eliminadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async (id) => void eliminadas.push(id) };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => existente };
    const r = await new EliminarConsulta(consultas, detalle).ejecutar('c1');
    expect(r.ok).toBe(true);
    expect(eliminadas).toEqual(['c1']);
  });

  it('una consulta que no existe devuelve ConsultaNoEncontradaError y no borra nada', async () => {
    const eliminadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async (id) => void eliminadas.push(id) };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => null };
    const r = await new EliminarConsulta(consultas, detalle).ejecutar('x');
    expect(!r.ok && r.error).toBeInstanceOf(ConsultaNoEncontradaError);
    expect(eliminadas).toEqual([]);
  });
});

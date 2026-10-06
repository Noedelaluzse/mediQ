import { describe, expect, it } from 'vitest';

import type { Consulta } from '../domain/Consulta';
import type { ConsultaRepository } from '../domain/ConsultaRepository';
import type { DetalleDeConsultaRepository } from '../domain/DetalleDeConsultaRepository';
import { ConsultaNoEncontradaError } from '../domain/errors';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import { EliminarConsulta } from './EliminarConsulta';

const sinRecordatorios = (quitadas: string[] = []): RecordatoriosDeTomaRepository => ({ listar: async () => [], reemplazarDe: async () => undefined, quitarDe: async (id) => void quitadas.push(id) });

const existente: Consulta = { id: 'c1', pacienteId: 'self', modo: 'presencial', tipo: 'general', especialidad: 'otra', fecha: new Date(2026, 9, 1), indicaciones: [] };

describe('EliminarConsulta (CU-06)', () => {
  it('elimina una consulta existente', async () => {
    const eliminadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async (id) => void eliminadas.push(id) };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => existente };
    const r = await new EliminarConsulta(consultas, detalle, sinRecordatorios()).ejecutar('c1');
    expect(r.ok).toBe(true);
    expect(eliminadas).toEqual(['c1']);
  });

  it('una consulta que no existe devuelve ConsultaNoEncontradaError y no borra nada', async () => {
    const eliminadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async (id) => void eliminadas.push(id) };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => null };
    const r = await new EliminarConsulta(consultas, detalle, sinRecordatorios()).ejecutar('x');
    expect(!r.ok && r.error).toBeInstanceOf(ConsultaNoEncontradaError);
    expect(eliminadas).toEqual([]);
  });

  it('al eliminar una consulta se borran también sus recordatorios de toma (no deben seguir sonando)', async () => {
    const quitadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async () => {} };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => existente };
    await new EliminarConsulta(consultas, detalle, sinRecordatorios(quitadas)).ejecutar('c1');
    expect(quitadas).toEqual(['c1']);
  });

  it('si borrar los recordatorios falla, no se elimina la consulta: se puede reintentar sin dejar avisos de algo que ya no existe', async () => {
    const eliminadas: string[] = [];
    const consultas: ConsultaRepository = { guardar: async () => {}, actualizar: async () => {}, eliminar: async (id) => void eliminadas.push(id) };
    const detalle: DetalleDeConsultaRepository = { obtener: async () => existente };
    const roto: RecordatoriosDeTomaRepository = { listar: async () => [], reemplazarDe: async () => undefined, quitarDe: async () => Promise.reject(new Error('sin red')) };
    await expect(new EliminarConsulta(consultas, detalle, roto).ejecutar('c1')).rejects.toThrow('sin red');
    expect(eliminadas).toEqual([]);
  });
});

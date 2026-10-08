import { describe, expect, it } from 'vitest';

import { avisosDeToma, type RecordatorioDeToma } from './Toma';
import { conEstadoActual, tomasDelDia } from './TomasDelDia';

const recordatorio = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId: 'c1',
  indice: 0,
  medicamentoId: 'mA',
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde: new Date(2026, 9, 6, 7, 0),
  hasta: new Date(2026, 9, 9, 7, 0),
  ...extra,
});
const sinTomadas = new Map<string, Date>();

describe('tomasDelDia (la tarjeta «Hoy»)', () => {
  const dia = new Date(2026, 9, 7, 12, 0);

  it('lista las tomas de ese día en orden de hora', () => {
    const t = tomasDelDia([recordatorio()], dia, sinTomadas, new Date(2026, 9, 7, 6, 0));
    expect(t.map((x) => x.toma.programadaPara)).toEqual([new Date(2026, 9, 7, 0, 0), new Date(2026, 9, 7, 8, 0), new Date(2026, 9, 7, 16, 0)]);
  });

  it('cada toma lleva los datos para marcarla y el mismo id que su aviso (así se cancela el aviso correcto)', () => {
    const [t] = tomasDelDia([recordatorio()], dia, sinTomadas, dia);
    const aviso = avisosDeToma([recordatorio()], new Date(2026, 9, 6, 6, 0)).find((a) => a.id === t.tomaId);
    expect(aviso).toBeDefined();
    expect(t.consultaId).toBe('c1');
    expect(t.toma).toMatchObject({ tomaId: t.tomaId, indice: 0, medicamento: 'Losartán', dosis: '1 tableta' });
  });

  it('el estado: tomada, atrasada (ya pasó su hora) o pendiente', () => {
    const ahora = new Date(2026, 9, 7, 10, 0);
    const [medianoche, ocho, dieciseis] = tomasDelDia([recordatorio()], dia, sinTomadas, ahora);
    expect([medianoche.estado, ocho.estado, dieciseis.estado]).toEqual(['atrasada', 'atrasada', 'pendiente']);
    const tomadas = new Map([[ocho.tomaId, new Date(2026, 9, 7, 8, 2)]]);
    const t = tomasDelDia([recordatorio()], dia, tomadas, ahora);
    expect(t[1]).toMatchObject({ estado: 'tomada', tomadaEn: new Date(2026, 9, 7, 8, 2) });
    expect(t[0].estado).toBe('atrasada');
  });

  it('una toma tomada antes de su hora cuenta como tomada', () => {
    const ahora = new Date(2026, 9, 7, 15, 0);
    const [, , dieciseis] = tomasDelDia([recordatorio()], dia, sinTomadas, ahora);
    const t = tomasDelDia([recordatorio()], dia, new Map([[dieciseis.tomaId, new Date(2026, 9, 7, 14, 50)]]), ahora);
    expect(t[2]).toMatchObject({ estado: 'tomada', tomadaEn: new Date(2026, 9, 7, 14, 50) });
  });

  it('solo tomas dentro del tratamiento: nada antes de activarlo ni a partir de «hasta»', () => {
    const primerDia = tomasDelDia([recordatorio()], new Date(2026, 9, 6, 12, 0), sinTomadas, dia);
    expect(primerDia.map((x) => x.toma.programadaPara)).toEqual([new Date(2026, 9, 6, 8, 0), new Date(2026, 9, 6, 16, 0)]);
    expect(tomasDelDia([recordatorio()], new Date(2026, 9, 9, 12, 0), sinTomadas, dia).map((x) => x.toma.programadaPara)).toEqual([new Date(2026, 9, 9, 0, 0)]);
    expect(tomasDelDia([recordatorio()], new Date(2026, 9, 12, 12, 0), sinTomadas, dia)).toEqual([]);
    expect(tomasDelDia([recordatorio()], new Date(2026, 9, 1, 12, 0), sinTomadas, dia)).toEqual([]);
  });

  it('«Una sola vez» da una toma, y solo el día que toca', () => {
    const r = recordatorio({ frecuencia: 'Una sola vez', primeraToma: '10:00', desde: new Date(2026, 9, 6, 9, 0) });
    expect(tomasDelDia([r], new Date(2026, 9, 6, 12, 0), sinTomadas, dia)).toHaveLength(1);
    expect(tomasDelDia([r], new Date(2026, 9, 7, 12, 0), sinTomadas, dia)).toEqual([]);
  });

  it('con varios medicamentos las ordena por hora y luego por posición en la receta', () => {
    const a = recordatorio({ medicamento: 'A', frecuencia: 'Cada 24 horas', primeraToma: '09:00' });
    const b = recordatorio({ medicamento: 'B', medicamentoId: 'mB', indice: 1, frecuencia: 'Cada 24 horas', primeraToma: '08:00' });
    const c = recordatorio({ medicamento: 'C', medicamentoId: 'mC', indice: 2, consultaId: 'c2', frecuencia: 'Cada 24 horas', primeraToma: '08:00' });
    expect(tomasDelDia([a, b, c], dia, sinTomadas, dia).map((x) => x.toma.medicamento)).toEqual(['B', 'C', 'A']);
  });

  it('una frecuencia que no se puede calcular no da tomas; sin recordatorios, tampoco', () => {
    expect(tomasDelDia([recordatorio({ frecuencia: 'Solo si hay dolor o fiebre' })], dia, sinTomadas, dia)).toEqual([]);
    expect(tomasDelDia([], dia, sinTomadas, dia)).toEqual([]);
  });
});

describe('conEstadoActual (pasa el tiempo sin volver a consultar)', () => {
  it('una pendiente se vuelve atrasada cuando llega su hora; las tomadas no cambian', () => {
    const dia = new Date(2026, 9, 7, 12, 0);
    const temprano = new Date(2026, 9, 7, 15, 59);
    const todas = tomasDelDia([recordatorio()], dia, new Map([[tomasDelDia([recordatorio()], dia, sinTomadas, temprano)[1].tomaId, new Date(2026, 9, 7, 8, 1)]]), temprano);
    expect(todas.map((t) => t.estado)).toEqual(['atrasada', 'tomada', 'pendiente']);
    const despues = conEstadoActual(todas, new Date(2026, 9, 7, 16, 1));
    expect(despues.map((t) => t.estado)).toEqual(['atrasada', 'tomada', 'atrasada']);
  });
});

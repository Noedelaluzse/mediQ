import { describe, expect, it } from 'vitest';

import {
  avisosDeToma,
  duracionEnDias,
  esHoraValida,
  horasDeToma,
  PRESUPUESTO_DE_TOMAS,
  PREFIJO_DE_TOMAS,
  recordatorioDeMedicamento,
  resumenDeTomas,
  type RecordatorioDeToma,
} from './Toma';

describe('horasDeToma: las horas del día a partir de la primera toma', () => {
  it('«Cada N horas» reparte el día desde la primera toma', () => {
    expect(horasDeToma('Cada 8 horas', '08:00')).toEqual({ horas: ['08:00', '16:00', '00:00'], unaVez: false });
    expect(horasDeToma('Cada 12 horas', '07:30')).toEqual({ horas: ['07:30', '19:30'], unaVez: false });
    expect(horasDeToma('Cada 6 horas', '06:00')).toEqual({ horas: ['06:00', '12:00', '18:00', '00:00'], unaVez: false });
    expect(horasDeToma('Cada 4 horas', '08:00')?.horas).toHaveLength(6);
    expect(horasDeToma('Cada 24 horas', '21:00')).toEqual({ horas: ['21:00'], unaVez: false });
  });

  it('«N veces al día» las espacia por igual (24/N horas)', () => {
    expect(horasDeToma('1 vez al día', '09:00')).toEqual({ horas: ['09:00'], unaVez: false });
    expect(horasDeToma('2 veces al día', '08:00')).toEqual({ horas: ['08:00', '20:00'], unaVez: false });
    expect(horasDeToma('3 veces al día', '08:00')).toEqual({ horas: ['08:00', '16:00', '00:00'], unaVez: false });
    expect(horasDeToma('4 veces al día', '06:00')).toEqual({ horas: ['06:00', '12:00', '18:00', '00:00'], unaVez: false });
  });

  it('«Antes de dormir» es una al día y «Una sola vez» es una única vez', () => {
    expect(horasDeToma('Antes de dormir', '22:00')).toEqual({ horas: ['22:00'], unaVez: false });
    expect(horasDeToma('Una sola vez', '10:00')).toEqual({ horas: ['10:00'], unaVez: true });
  });

  it('lo que no se puede calcular da null: solo si hay dolor, texto libre, frecuencia vacía u hora inválida', () => {
    expect(horasDeToma('Solo si hay dolor o fiebre', '08:00')).toBeNull();
    expect(horasDeToma('c/8 hrs', '08:00')).toBeNull();
    expect(horasDeToma('', '08:00')).toBeNull();
    expect(horasDeToma('Cada 8 horas', '8:00')).toBeNull();
    expect(horasDeToma('Cada 8 horas', '25:00')).toBeNull();
  });

  it('valida la hora HH:mm', () => {
    expect(esHoraValida('00:00')).toBe(true);
    expect(esHoraValida('23:59')).toBe(true);
    expect(esHoraValida('24:00')).toBe(false);
    expect(esHoraValida('9:00')).toBe(false);
    expect(esHoraValida('09:60')).toBe(false);
  });
});

describe('duracionEnDias', () => {
  it('días, semanas (×7) y meses (×30)', () => {
    expect(duracionEnDias('7 días')).toBe(7);
    expect(duracionEnDias('1 día')).toBe(1);
    expect(duracionEnDias('2 semanas')).toBe(14);
    expect(duracionEnDias('1 mes')).toBe(30);
    expect(duracionEnDias('3 meses')).toBe(90);
  });

  it('un texto que no es del catálogo no tiene duración calculable', () => {
    expect(duracionEnDias('una semana')).toBeNull();
    expect(duracionEnDias('')).toBeNull();
    expect(duracionEnDias(undefined)).toBeNull();
  });
});

describe('recordatorioDeMedicamento', () => {
  const desde = new Date(2026, 9, 6, 14, 0);

  it('arma el recordatorio con el fin = desde + duración', () => {
    const r = recordatorioDeMedicamento({ nombre: 'Losartán', dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00' }, 'c1', 0, desde);
    expect(r).toMatchObject({ consultaId: 'c1', indice: 0, medicamento: 'Losartán', dosis: '1 tableta', frecuencia: 'Cada 8 horas', primeraToma: '08:00', desde });
    expect(r?.hasta).toEqual(new Date(desde.getTime() + 7 * 86_400_000));
  });

  it('sin recordar, o con frecuencia, duración u hora que no se pueden calcular, no hay recordatorio', () => {
    const base = { nombre: 'A', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00' };
    expect(recordatorioDeMedicamento({ ...base, recordar: false }, 'c1', 0, desde)).toBeNull();
    expect(recordatorioDeMedicamento({ ...base, frecuencia: 'Solo si hay dolor o fiebre' }, 'c1', 0, desde)).toBeNull();
    expect(recordatorioDeMedicamento({ ...base, duracion: 'una semana' }, 'c1', 0, desde)).toBeNull();
    expect(recordatorioDeMedicamento({ ...base, primeraToma: undefined }, 'c1', 0, desde)).toBeNull();
  });
});

const recordatorio = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId: 'c1',
  indice: 0,
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '08:00',
  desde: new Date(2026, 9, 6, 7, 0),
  hasta: new Date(2026, 9, 9, 7, 0), // 3 días
  ...extra,
});

describe('avisosDeToma', () => {
  const ahora = new Date(2026, 9, 6, 6, 0);

  it('un aviso por cada toma futura dentro del tratamiento, en orden', () => {
    const r = avisosDeToma([recordatorio()], ahora);
    expect(r.map((a) => a.cuando)).toEqual([
      new Date(2026, 9, 6, 8, 0),
      new Date(2026, 9, 6, 16, 0),
      new Date(2026, 9, 7, 0, 0),
      new Date(2026, 9, 7, 8, 0),
      new Date(2026, 9, 7, 16, 0),
      new Date(2026, 9, 8, 0, 0),
      new Date(2026, 9, 8, 8, 0),
      new Date(2026, 9, 8, 16, 0),
      new Date(2026, 9, 9, 0, 0),
    ]);
  });

  it('el texto lleva el nombre y la dosis (decidido con el usuario) y el aviso abre su consulta', () => {
    const [a] = avisosDeToma([recordatorio()], ahora);
    expect(a.titulo).toBe('Hora de tu medicamento');
    expect(a.cuerpo).toBe('Losartán · 1 tableta');
    expect(a.consultaId).toBe('c1');
    expect(a.id).toBe(`${PREFIJO_DE_TOMAS}c1-0-202610060800`);
  });

  it('sin dosis, el cuerpo es solo el nombre', () => {
    expect(avisosDeToma([recordatorio({ dosis: undefined })], ahora)[0].cuerpo).toBe('Losartán');
  });

  it('no avisa de tomas que ya pasaron ni de las anteriores al momento de activarlo', () => {
    const tarde = new Date(2026, 9, 6, 17, 0);
    const r = avisosDeToma([recordatorio({ desde: new Date(2026, 9, 6, 14, 0) })], tarde);
    expect(r[0].cuando).toEqual(new Date(2026, 9, 7, 0, 0));
    const activadoALas = avisosDeToma([recordatorio({ desde: new Date(2026, 9, 6, 9, 0) })], new Date(2026, 9, 6, 9, 0));
    expect(activadoALas[0].cuando).toEqual(new Date(2026, 9, 6, 16, 0));
  });

  it('termina cuando termina el tratamiento: nada a partir de «hasta»', () => {
    const r = avisosDeToma([recordatorio()], ahora);
    expect(r.every((a) => a.cuando.getTime() < new Date(2026, 9, 9, 7, 0).getTime())).toBe(true);
    expect(avisosDeToma([recordatorio()], new Date(2026, 9, 10))).toEqual([]);
  });

  it('«Una sola vez» da un único aviso', () => {
    const r = avisosDeToma([recordatorio({ frecuencia: 'Una sola vez', primeraToma: '10:00' })], ahora);
    expect(r.map((a) => a.cuando)).toEqual([new Date(2026, 9, 6, 10, 0)]);
  });

  it('respeta el presupuesto de avisos (iOS solo admite 64 programados) y se queda con los más próximos', () => {
    const muchos = avisosDeToma([recordatorio({ frecuencia: 'Cada 4 horas', hasta: new Date(2026, 11, 31) })], ahora);
    expect(muchos).toHaveLength(PRESUPUESTO_DE_TOMAS);
    expect(muchos[0].cuando).toEqual(new Date(2026, 9, 6, 8, 0));
    const ordenados = [...muchos].sort((a, b) => a.cuando.getTime() - b.cuando.getTime());
    expect(muchos).toEqual(ordenados);
  });

  it('con varios medicamentos reparte el presupuesto por orden de hora, no por medicamento', () => {
    const a = recordatorio({ medicamento: 'A', frecuencia: 'Cada 4 horas', hasta: new Date(2026, 11, 31) });
    const b = recordatorio({ medicamento: 'B', indice: 1, primeraToma: '09:00', frecuencia: 'Cada 4 horas', hasta: new Date(2026, 11, 31) });
    const r = avisosDeToma([a, b], ahora, 10);
    expect(r).toHaveLength(10);
    expect(new Set(r.map((x) => x.cuerpo.split(' · ')[0]))).toEqual(new Set(['A', 'B']));
    expect(r[1].cuando.getTime()).toBeGreaterThanOrEqual(r[0].cuando.getTime());
  });

  it('sin recordatorios no hay avisos', () => {
    expect(avisosDeToma([], ahora)).toEqual([]);
  });
});

describe('resumenDeTomas (lo que se muestra al activar el aviso)', () => {
  it('lista las horas y la duración', () => {
    expect(resumenDeTomas('Cada 8 horas', '08:00', '7 días')).toBe('Te avisaremos a las 8:00, 16:00 y 0:00 durante 7 días');
    expect(resumenDeTomas('Cada 24 horas', '21:00', '1 día')).toBe('Te avisaremos a las 21:00 durante 1 día');
    expect(resumenDeTomas('2 veces al día', '07:30', '2 semanas')).toBe('Te avisaremos a las 7:30 y 19:30 durante 2 semanas');
  });

  it('«Una sola vez» no habla de duración', () => {
    expect(resumenDeTomas('Una sola vez', '10:00', '1 día')).toBe('Te avisaremos una vez, a las 10:00');
  });

  it('si no se puede calcular, devuelve null', () => {
    expect(resumenDeTomas('Solo si hay dolor o fiebre', '08:00', '7 días')).toBeNull();
    expect(resumenDeTomas('Cada 8 horas', '08:00', 'una semana')).toBeNull();
  });
});

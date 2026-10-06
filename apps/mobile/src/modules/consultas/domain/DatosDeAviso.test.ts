import { describe, expect, it } from 'vitest';

import type { AvisoLocal } from './AvisoLocal';
import { ACCION_POSPONER, ACCION_TOMADA, aDatosDeAviso, interpretarRespuesta } from './DatosDeAviso';

const aviso: AvisoLocal = {
  id: 'toma-c1-0-202610060800',
  consultaId: 'c1',
  cuando: new Date(2026, 9, 6, 8, 0),
  titulo: 'Hora de tu medicamento',
  cuerpo: 'Losartán · 1 tableta',
  categoria: 'toma',
  toma: { tomaId: 'toma-c1-0-202610060800', indice: 0, programadaPara: new Date(2026, 9, 6, 8, 0), medicamento: 'Losartán', dosis: '1 tableta' },
};

describe('datos que viajan dentro del aviso', () => {
  it('un aviso de cita lleva solo la consulta (como antes)', () => {
    expect(aDatosDeAviso({ id: 'cita-c1-vispera', consultaId: 'c1', cuando: new Date(), titulo: 't', cuerpo: 'b' })).toEqual({ consultaId: 'c1' });
  });

  it('un aviso de toma lleva la consulta y los datos de la dosis (la fecha como texto, porque los datos se guardan como JSON)', () => {
    const d = aDatosDeAviso(aviso);
    expect(d.consultaId).toBe('c1');
    expect(typeof (d.toma as { programadaPara: unknown }).programadaPara).toBe('string');
  });

  it('tocar el aviso (o su cuerpo) abre la consulta; si es de toma, además pide quitar la insistencia', () => {
    expect(interpretarRespuesta('expo.modules.notifications.actions.DEFAULT', { consultaId: 'c1' })).toEqual({ tipo: 'abrir', consultaId: 'c1' });
    const r = interpretarRespuesta('expo.modules.notifications.actions.DEFAULT', aDatosDeAviso(aviso));
    expect(r).toEqual({ tipo: 'abrir', consultaId: 'c1', toma: aviso.toma });
  });

  it('«Ya la tomé» y «Recordar en 5 min» se reconocen con los datos de la dosis', () => {
    const datos = aDatosDeAviso(aviso);
    expect(interpretarRespuesta(ACCION_TOMADA, datos)).toEqual({ tipo: 'tomada', consultaId: 'c1', toma: aviso.toma });
    expect(interpretarRespuesta(ACCION_POSPONER, datos)).toEqual({ tipo: 'posponer', consultaId: 'c1', toma: aviso.toma });
  });

  it('un botón de toma sin datos de la dosis (aviso dañado o de otra versión) no hace nada', () => {
    expect(interpretarRespuesta(ACCION_TOMADA, { consultaId: 'c1' })).toBeNull();
    expect(interpretarRespuesta(ACCION_POSPONER, { consultaId: 'c1', toma: { tomaId: 'x' } })).toBeNull();
    expect(interpretarRespuesta(ACCION_TOMADA, undefined)).toBeNull();
  });

  it('sin consulta no hay nada que abrir', () => {
    expect(interpretarRespuesta('expo.modules.notifications.actions.DEFAULT', {})).toBeNull();
  });
});

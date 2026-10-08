import { describe, expect, it } from 'vitest';

import { avisosDeToma, idDeToma, recordatorioDeMedicamento, type RecordatorioDeToma } from './Toma';
import { tomasDelDia } from './TomasDelDia';

/**
 * AUD-01 / F062: una toma se identifica por el MEDICAMENTO (su id propio), no por su posición en la receta. Antes el id era
 * `toma-{consulta}-{posición}-{hora}`: un medicamento nuevo en la misma posición y hora heredaba las marcas «Ya la tomé» del anterior.
 */
const recordatorio = (extra: Partial<RecordatorioDeToma> = {}): RecordatorioDeToma => ({
  consultaId: 'c1',
  indice: 0,
  medicamentoId: 'mA',
  medicamento: 'Losartán',
  dosis: '1 tableta',
  frecuencia: 'Cada 8 horas',
  primeraToma: '20:00',
  desde: new Date(2026, 9, 7, 7, 0),
  hasta: new Date(2026, 9, 14, 7, 0),
  ...extra,
});
const dia = new Date(2026, 9, 8, 12, 0);
const ocho = new Date(2026, 9, 8, 20, 0);

describe('idDeToma: la identidad es el medicamento, no la posición', () => {
  it('lleva consulta, id del medicamento y hora (y no la posición)', () => {
    expect(idDeToma(recordatorio(), ocho)).toBe('toma-c1-mA-202610082000');
  });

  it('dos medicamentos distintos en la misma posición y a la misma hora NO comparten id', () => {
    expect(idDeToma(recordatorio({ medicamentoId: 'mA' }), ocho)).not.toBe(idDeToma(recordatorio({ medicamentoId: 'mB' }), ocho));
  });

  it('el mismo medicamento que cambia de posición (se quitó otro o se reordenó) conserva su id', () => {
    expect(idDeToma(recordatorio({ indice: 0 }), ocho)).toBe(idDeToma(recordatorio({ indice: 2 }), ocho));
  });
});

describe('el caso reproducido por la auditoría: A se sustituye por B en la misma fila y hora', () => {
  it('lo que se marcó como tomado de A NO aparece tomado en B', () => {
    const a = recordatorio({ medicamentoId: 'mA', medicamento: 'A' });
    const b = recordatorio({ medicamentoId: 'mB', medicamento: 'B', desde: new Date(2026, 9, 8, 7, 0) });
    // A: la dosis de las 20:00 se marcó ANTES de su hora (la app lo permite).
    const tomadas = new Map([[idDeToma(a, ocho), new Date(2026, 9, 8, 9, 0)]]);

    const deB = tomasDelDia([b], dia, tomadas, new Date(2026, 9, 8, 10, 0)).find((t) => t.toma.programadaPara.getTime() === ocho.getTime());
    expect(deB).toBeDefined();
    expect(deB?.estado).toBe('pendiente');
    expect(deB?.tomadaEn).toBeUndefined();

    // y la de A sí sigue tomada
    expect(tomasDelDia([a], dia, tomadas, new Date(2026, 9, 8, 10, 0)).find((t) => t.toma.programadaPara.getTime() === ocho.getTime())?.estado).toBe('tomada');
  });

  it('los avisos tampoco se excluyen por una marca del medicamento anterior', () => {
    const a = recordatorio({ medicamentoId: 'mA' });
    const b = recordatorio({ medicamentoId: 'mB' });
    const idsDeB = avisosDeToma([b], new Date(2026, 9, 8, 6, 0)).map((x) => x.id);
    expect(idsDeB.length).toBeGreaterThan(0);
    expect(idsDeB).not.toContain(idDeToma(a, ocho));
  });
});

describe('recordatorioDeMedicamento: el recordatorio nace con la identidad del medicamento', () => {
  const desde = new Date(2026, 9, 6, 14, 0);
  const med = { id: 'mA', nombre: 'Losartán', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '08:00' };

  it('copia el id del medicamento', () => {
    expect(recordatorioDeMedicamento(med, 'c1', 3, desde)).toMatchObject({ medicamentoId: 'mA', indice: 3 });
  });

  it('un medicamento sin id no tiene identidad: no hay recordatorio (no se inventa una por posición)', () => {
    expect(recordatorioDeMedicamento({ ...med, id: undefined }, 'c1', 0, desde)).toBeNull();
  });
});

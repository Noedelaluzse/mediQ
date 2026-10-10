import { describe, expect, it } from 'vitest';

import { LecturaCompartida } from '@/shared/kernel/lecturaCompartida';
import { VIGENCIA_DE_BUSQUEDA_MS } from '@/shared/kernel/frescura';

import type { ConsultaDelDiario } from '../domain/Diario';
import { CargarTodoElDiarioConCopia } from './CargarTodoElDiarioConCopia';
import type { DiarioCompleto } from './CargarTodoElDiario';

/**
 * F071 (AUD-11): cada búsqueda tras recargar el Diario bajaba otra vez todo el historial. Ahora se reusa la copia mientras nada cambie.
 */
const consulta = (n: number): ConsultaDelDiario => ({ id: `c${n}`, fecha: new Date(2026, 0, n + 1), especialidad: 'otra', tipo: 'otro' });

const montar = (resultado: () => Promise<DiarioCompleto> = async () => ({ consultas: [consulta(1), consulta(2)], truncado: false })) => {
  let version = 1;
  let ahora = 1_000_000;
  let lecturas = 0;
  const real = { ejecutar: () => (lecturas++, resultado()) };
  const caso = new CargarTodoElDiarioConCopia(real, new LecturaCompartida<DiarioCompleto>(() => ahora, VIGENCIA_DE_BUSQUEDA_MS, () => version));
  return { caso, lecturas: () => lecturas, escribir: () => version++, avanzar: (ms: number) => (ahora += ms) };
};

describe('CargarTodoElDiarioConCopia', () => {
  it('buscar otra vez con los datos sin cambios no baja el historial de nuevo', async () => {
    const { caso, lecturas } = montar();
    await caso.ejecutar();
    await caso.ejecutar();
    await caso.ejecutar();
    expect(lecturas()).toBe(1);
  });

  it('dos búsquedas a la vez comparten la misma lectura', async () => {
    const { caso, lecturas } = montar();
    await Promise.all([caso.ejecutar(), caso.ejecutar()]);
    expect(lecturas()).toBe(1);
  });

  it('si se guardó, editó o borró algo (o se cerró sesión) vuelve a bajar el historial', async () => {
    const { caso, lecturas, escribir } = montar();
    await caso.ejecutar();
    escribir();
    await caso.ejecutar();
    expect(lecturas()).toBe(2);
  });

  it('pasada la vigencia de la búsqueda (5 minutos) vuelve a bajarlo; antes, no', async () => {
    const { caso, lecturas, avanzar } = montar();
    await caso.ejecutar();
    avanzar(VIGENCIA_DE_BUSQUEDA_MS - 1);
    await caso.ejecutar();
    expect(lecturas()).toBe(1);
    avanzar(2);
    await caso.ejecutar();
    expect(lecturas()).toBe(2);
  });

  it('la vigencia de la búsqueda es de 5 minutos', () => {
    expect(VIGENCIA_DE_BUSQUEDA_MS).toBe(5 * 60_000);
  });

  it('un fallo no se guarda: la siguiente búsqueda lo intenta de nuevo', async () => {
    let falla = true;
    const { caso, lecturas } = montar(async () => {
      if (falla) throw new Error('sin conexión');
      return { consultas: [consulta(1)], truncado: false };
    });
    await expect(caso.ejecutar()).rejects.toThrow('sin conexión');
    falla = false;
    await expect(caso.ejecutar()).resolves.toMatchObject({ truncado: false });
    expect(lecturas()).toBe(2);
  });

  it('conserva el aviso de resultados parciales (más de 2,000)', async () => {
    const { caso } = montar(async () => ({ consultas: [consulta(1)], truncado: true }));
    await caso.ejecutar();
    expect((await caso.ejecutar()).truncado).toBe(true);
  });

  it('cada quien recibe su propia copia de la lista', async () => {
    const { caso } = montar();
    const a = await caso.ejecutar();
    a.consultas.pop();
    const b = await caso.ejecutar();
    expect(b.consultas).toHaveLength(2);
  });
});

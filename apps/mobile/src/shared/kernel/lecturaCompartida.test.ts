import { describe, expect, it } from 'vitest';

import { LecturaCompartida } from './lecturaCompartida';

/**
 * F070 (AUD-10): al abrir el Diario varias cosas leían lo mismo a la vez (la tarjeta «Hoy» y los avisos de toma, la tarjeta «Próxima cita» y los
 * avisos de citas). `LecturaCompartida` hace UNA sola lectura y la reparte, mientras no haya cambiado nada en la app y no pase la vigencia.
 */
const montar = (vigenciaMs = 60_000) => {
  let ahora = 1_000_000;
  let version = 1;
  const lecturas: string[] = [];
  const compartida = new LecturaCompartida<string>(() => ahora, vigenciaMs, () => version);
  const leer = (clave: string, valor = clave) => compartida.ejecutar(clave, async () => (lecturas.push(clave), valor));
  return { compartida, leer, lecturas, avanzar: (ms: number) => (ahora += ms), escribir: () => (version += 1) };
};

describe('LecturaCompartida', () => {
  it('dos llamadas casi a la vez hacen UNA sola lectura y reciben lo mismo', async () => {
    const m = montar();
    const [a, b] = await Promise.all([m.leer('x', 'datos'), m.leer('x', 'otros')]);
    expect(a).toBe('datos');
    expect(b).toBe('datos');
    expect(m.lecturas).toEqual(['x']);
  });

  it('dentro de la vigencia reutiliza lo leído; pasada la vigencia vuelve a leer', async () => {
    const m = montar(60_000);
    await m.leer('x');
    m.avanzar(59_999);
    await m.leer('x');
    expect(m.lecturas).toHaveLength(1);
    m.avanzar(1);
    await m.leer('x');
    expect(m.lecturas).toHaveLength(2);
  });

  it('si algo se guardó, editó o borró en la app (cambió la versión de datos), vuelve a leer aunque no haya pasado el tiempo', async () => {
    const m = montar();
    await m.leer('x');
    m.escribir();
    await m.leer('x');
    expect(m.lecturas).toHaveLength(2);
  });

  it('una escritura que ocurre MIENTRAS se lee no deja pasar esa lectura como vigente: la siguiente llamada ya lee de nuevo', async () => {
    const m = montar();
    let liberar!: () => void;
    const lenta = m.compartida.ejecutar('x', () => new Promise<string>((r) => (liberar = () => r('vieja'))));
    m.escribir(); // se guarda algo mientras la lectura sigue en curso
    const nueva = m.leer('x', 'nueva');
    liberar();
    expect(await lenta).toBe('vieja');
    expect(await nueva).toBe('nueva');
    expect(m.lecturas).toEqual(['x']); // la lenta no está en `lecturas`; la nueva sí
  });

  it('otra clave (otra pregunta) no reutiliza lo anterior', async () => {
    const m = montar();
    await m.leer('a');
    await m.leer('b');
    expect(m.lecturas).toEqual(['a', 'b']);
  });

  it('un fallo no se guarda: el error llega a quienes esperaban y la siguiente llamada vuelve a intentar', async () => {
    const m = montar();
    const falla = () => m.compartida.ejecutar('x', () => Promise.reject(new Error('sin red')));
    await expect(Promise.all([falla(), falla()])).rejects.toThrow('sin red');
    expect(await m.leer('x', 'bien')).toBe('bien');
  });

  it('`limpiar` descarta lo guardado (por ejemplo al cerrar sesión)', async () => {
    const m = montar();
    await m.leer('x');
    m.compartida.limpiar();
    await m.leer('x');
    expect(m.lecturas).toHaveLength(2);
  });
});

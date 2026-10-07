import { describe, expect, it } from 'vitest';

import { DomainError } from '@/shared/kernel/DomainError';
import { ErrorDeRed } from '@/shared/kernel/red';
import { err, ok, type Result } from '@/shared/kernel/Result';

import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';
import type { Consulta } from '../domain/Consulta';
import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import type { Conectividad } from '@/shared/kernel/Conectividad';
import { FechaFuturaError } from '../domain/errors';
import { DescartarConsultaPendiente } from './DescartarConsultaPendiente';
import { EnviarConsultasPendientes } from './EnviarConsultasPendientes';
import { GuardarConsultaNueva } from './GuardarConsultaNueva';
import { ListarConsultasPendientes } from './ListarConsultasPendientes';
import type { EntradaRegistrarConsulta } from './prepararConsulta';

const ahora = new Date(2026, 9, 5, 12, 0);
const entrada: EntradaRegistrarConsulta = { fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'cardiologia' };

class Cola implements ColaDeEnvioRepository {
  items: ConsultaPendiente[] = [];
  async agregar(c: ConsultaPendiente) {
    this.items.push(c);
  }
  async listar() {
    return [...this.items].sort((a, b) => a.creadaEn.getTime() - b.creadaEn.getTime());
  }
  async actualizar(c: ConsultaPendiente) {
    this.items = this.items.map((i) => (i.id === c.id ? c : i));
  }
  async quitar(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }
  async vaciar() {
    this.items = [];
  }
}

class Red implements Conectividad {
  constructor(public conectado = true) {}
  async estaConectado() {
    return this.conectado;
  }
  suscribir() {
    return () => undefined;
  }
}

/** Un «RegistrarConsulta» de mentira: cada envío saca una respuesta de la lista (o repite la última). */
class Registrador {
  llamadas: { entrada: EntradaRegistrarConsulta; id?: string }[] = [];
  constructor(private respuestas: (Result<Consulta, DomainError> | Error)[] = [ok({ id: 'x' } as Consulta)]) {}
  async ejecutar(e: EntradaRegistrarConsulta, id?: string): Promise<Result<Consulta, DomainError>> {
    this.llamadas.push({ entrada: e, id });
    const r = this.respuestas.length > 1 ? this.respuestas.shift()! : this.respuestas[0];
    if (r instanceof Error) throw r;
    return r;
  }
}

const montarGuardar = (opciones: { red?: Red; registrador?: Registrador; cola?: Cola } = {}) => {
  const cola = opciones.cola ?? new Cola();
  const red = opciones.red ?? new Red();
  const registrador = opciones.registrador ?? new Registrador();
  const uc = new GuardarConsultaNueva(registrador as never, cola, red, () => 'id-local', () => ahora);
  return { uc, cola, red, registrador };
};

describe('GuardarConsultaNueva', () => {
  it('con internet la envía de una vez y no queda nada en la cola', async () => {
    const { uc, cola, registrador } = montarGuardar();
    const r = await uc.ejecutar(entrada);
    expect(r.ok && r.value.estado).toBe('enviada');
    expect(registrador.llamadas).toHaveLength(1);
    expect(registrador.llamadas[0].id).toBe('id-local');
    expect(cola.items).toEqual([]);
  });

  it('sin internet ni lo intenta: la deja en la cola y avisa', async () => {
    const { uc, cola, registrador } = montarGuardar({ red: new Red(false) });
    const r = await uc.ejecutar(entrada);
    expect(r.ok && r.value).toEqual({ estado: 'en-cola', id: 'id-local' });
    expect(registrador.llamadas).toEqual([]);
    expect(cola.items).toEqual([{ id: 'id-local', entrada, creadaEn: ahora, intentos: 0 }]);
  });

  it('si creía tener internet pero el envío falla por red (o se agota el tiempo), también la deja en la cola', async () => {
    const { uc, cola } = montarGuardar({ registrador: new Registrador([new ErrorDeRed()]) });
    const r = await uc.ejecutar(entrada);
    expect(r.ok && r.value.estado).toBe('en-cola');
    expect(cola.items).toHaveLength(1);
  });

  it('los datos inválidos se rechazan ANTES de tocar la cola o la red (el formulario muestra el error de siempre)', async () => {
    const { uc, cola, registrador } = montarGuardar({ red: new Red(false) });
    const r = await uc.ejecutar({ ...entrada, fecha: new Date(2026, 9, 6) });
    expect(!r.ok && r.error).toBeInstanceOf(FechaFuturaError);
    expect(cola.items).toEqual([]);
    expect(registrador.llamadas).toEqual([]);
  });

  it('un rechazo del dominio al enviar se devuelve tal cual y no se encola', async () => {
    const { uc, cola } = montarGuardar({ registrador: new Registrador([err(new DomainError('no'))]) });
    const r = await uc.ejecutar(entrada);
    expect(r.ok).toBe(false);
    expect(cola.items).toEqual([]);
  });

  it('un error que NO es de red (p. ej. permisos) sube como excepción: no se esconde en la cola', async () => {
    const { uc, cola } = montarGuardar({ registrador: new Registrador([Object.assign(new Error('permiso'), { code: 'permission-denied' })]) });
    await expect(uc.ejecutar(entrada)).rejects.toThrow('permiso');
    expect(cola.items).toEqual([]);
  });
});

const pendiente = (id: string, minutos: number, extra: Partial<ConsultaPendiente> = {}): ConsultaPendiente => ({ id, entrada, creadaEn: new Date(2026, 9, 5, 10, minutos), intentos: 0, ...extra });

describe('EnviarConsultasPendientes', () => {
  const montar = (items: ConsultaPendiente[], registrador = new Registrador(), red = new Red()) => {
    const cola = new Cola();
    cola.items = items;
    return { cola, registrador, enviar: new EnviarConsultasPendientes(cola, registrador as never, red) };
  };

  it('con internet envía todas en el orden en que se capturaron y las quita de la cola', async () => {
    const { cola, registrador, enviar } = montar([pendiente('b', 5), pendiente('a', 1)]);
    const r = await enviar.ejecutar();
    expect(registrador.llamadas.map((l) => l.id)).toEqual(['a', 'b']);
    expect(cola.items).toEqual([]);
    expect(r).toMatchObject({ enviadas: 2, fallidas: 0, pendientes: 0 });
  });

  it('sin internet no hace nada', async () => {
    const { cola, registrador, enviar } = montar([pendiente('a', 1)], new Registrador(), new Red(false));
    const r = await enviar.ejecutar();
    expect(registrador.llamadas).toEqual([]);
    expect(cola.items).toHaveLength(1);
    expect(r).toMatchObject({ enviadas: 0, pendientes: 1 });
  });

  it('si la red falla a la mitad, se detiene: lo enviado se queda enviado y el resto espera con un intento más', async () => {
    const { cola, enviar } = montar([pendiente('a', 1), pendiente('b', 2), pendiente('c', 3)], new Registrador([ok({ id: 'a' } as Consulta), new ErrorDeRed()]));
    const r = await enviar.ejecutar();
    expect(cola.items.map((i) => [i.id, i.intentos])).toEqual([
      ['b', 1],
      ['c', 0],
    ]);
    expect(r).toMatchObject({ enviadas: 1, pendientes: 2 });
  });

  it('un rechazo del dominio marca esa consulta como fallida (con su motivo) y sigue con las demás', async () => {
    const { cola, enviar } = montar([pendiente('a', 1), pendiente('b', 2)], new Registrador([err(new FechaFuturaError()), ok({ id: 'b' } as Consulta)]));
    const r = await enviar.ejecutar();
    expect(cola.items).toHaveLength(1);
    expect(cola.items[0]).toMatchObject({ id: 'a', error: expect.stringContaining('futura') });
    expect(r).toMatchObject({ enviadas: 1, fallidas: 1 });
  });

  it('una excepción que no es de red (permisos) también la marca fallida y sigue', async () => {
    const { cola, enviar } = montar([pendiente('a', 1), pendiente('b', 2)], new Registrador([Object.assign(new Error('x'), { code: 'permission-denied' }), ok({ id: 'b' } as Consulta)]));
    await enviar.ejecutar();
    expect(cola.items.map((i) => [i.id, Boolean(i.error)])).toEqual([['a', true]]);
  });

  it('las ya marcadas como fallidas no se reintentan solas', async () => {
    const { registrador, enviar } = montar([pendiente('a', 1, { error: 'motivo' })]);
    await enviar.ejecutar();
    expect(registrador.llamadas).toEqual([]);
  });

  it('dos ejecuciones a la vez no envían dos veces la misma consulta', async () => {
    const { registrador, enviar } = montar([pendiente('a', 1)]);
    await Promise.all([enviar.ejecutar(), enviar.ejecutar()]);
    expect(registrador.llamadas.map((l) => l.id)).toEqual(['a']);
  });
});

describe('ListarConsultasPendientes y DescartarConsultaPendiente', () => {
  it('lista en orden y se puede descartar una', async () => {
    const cola = new Cola();
    cola.items = [pendiente('b', 5), pendiente('a', 1)];
    expect((await new ListarConsultasPendientes(cola).ejecutar()).map((i) => i.id)).toEqual(['a', 'b']);
    await new DescartarConsultaPendiente(cola).ejecutar('a');
    expect(cola.items.map((i) => i.id)).toEqual(['b']);
  });
});

import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { ErrorDeRed } from '@/shared/kernel/red';

import type { Consulta } from '../domain/Consulta';
import type { Medicamento } from '../domain/Receta';
import type { DetalleDeConsulta } from './ObtenerDetalleDeConsulta';
import { ObtenerDetalleDeConsultaConCopiaLocal } from './ObtenerDetalleDeConsultaConCopiaLocal';
import { ObtenerRecetaConCopiaLocal } from './ObtenerRecetaConCopiaLocal';

class Copia implements CopiaLocal {
  datos = new Map<string, string>();
  async guardar(clave: string, contenido: string) {
    this.datos.set(clave, contenido);
  }
  async leer(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  async limpiar() {
    this.datos.clear();
  }
}
const red = (conectado: boolean): Conectividad => ({ estaConectado: async () => conectado, suscribir: () => () => undefined });

const consulta = (id: string): Consulta => ({ id, pacienteId: 'self', modo: 'presencial', tipo: 'general', especialidad: 'medicina-general', fecha: new Date(2026, 9, 4, 9, 30), motivo: `Motivo ${id}`, indicaciones: [{ id: 'i', texto: 'Reposo', orden: 0 }] });
const detalle = (id: string): DetalleDeConsulta => ({ consulta: consulta(id), indicaciones: consulta(id).indicaciones, telefonoDelMedico: '998' });

describe('ObtenerDetalleDeConsultaConCopiaLocal (el detalle que ya abriste se lee sin internet)', () => {
  const real = (resultado: DetalleDeConsulta | null | Error) => {
    const llamadas: string[] = [];
    return { llamadas, ejecutar: async (id: string) => (llamadas.push(id), resultado instanceof Error ? Promise.reject(resultado) : resultado) };
  };

  it('con internet devuelve lo real y guarda la copia de ESA consulta (cada una con su clave)', async () => {
    const copia = new Copia();
    await new ObtenerDetalleDeConsultaConCopiaLocal(real(detalle('a')), copia, red(true)).ejecutar('a');
    await new ObtenerDetalleDeConsultaConCopiaLocal(real(detalle('b')), copia, red(true)).ejecutar('b');
    expect(copia.datos.size).toBe(2);
  });

  it('sin internet devuelve la copia de la consulta que se abrió antes, sin llamar al servidor', async () => {
    const copia = new Copia();
    await new ObtenerDetalleDeConsultaConCopiaLocal(real(detalle('a')), copia, red(true)).ejecutar('a');
    const r = real(detalle('a'));
    expect(await new ObtenerDetalleDeConsultaConCopiaLocal(r, copia, red(false)).ejecutar('a')).toEqual(detalle('a'));
    expect(r.llamadas).toEqual([]);
  });

  it('sin internet y sin haberla abierto antes falla (la pantalla muestra su error con «Reintentar»)', async () => {
    await expect(new ObtenerDetalleDeConsultaConCopiaLocal(real(detalle('a')), new Copia(), red(false)).ejecutar('a')).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('si el servidor falla por red, devuelve la copia; si es otro error, se propaga', async () => {
    const copia = new Copia();
    await new ObtenerDetalleDeConsultaConCopiaLocal(real(detalle('a')), copia, red(true)).ejecutar('a');
    expect(await new ObtenerDetalleDeConsultaConCopiaLocal(real(new ErrorDeRed()), copia, red(true)).ejecutar('a')).toEqual(detalle('a'));
    const permisos = Object.assign(new Error('permiso'), { code: 'permission-denied' });
    await expect(new ObtenerDetalleDeConsultaConCopiaLocal(real(permisos), copia, red(true)).ejecutar('a')).rejects.toBe(permisos);
  });

  it('una consulta que ya no existe (null) sigue devolviendo null', async () => {
    expect(await new ObtenerDetalleDeConsultaConCopiaLocal(real(null), new Copia(), red(true)).ejecutar('x')).toBeNull();
  });
});

describe('ObtenerRecetaConCopiaLocal', () => {
  const receta: Medicamento[] = [{ nombre: 'Losartán', dosis: '1 tableta' }];
  const real = (r: Medicamento[] | Error) => ({ ejecutar: async () => (r instanceof Error ? Promise.reject(r) : r) });

  it('con internet guarda la copia; sin internet la devuelve', async () => {
    const copia = new Copia();
    expect(await new ObtenerRecetaConCopiaLocal(real(receta), copia, red(true)).ejecutar('a')).toEqual(receta);
    expect(await new ObtenerRecetaConCopiaLocal(real(new ErrorDeRed()), copia, red(false)).ejecutar('a')).toEqual(receta);
  });

  it('una consulta sin receta (lista vacía) también se copia: sin internet sigue diciendo «sin receta»', async () => {
    const copia = new Copia();
    await new ObtenerRecetaConCopiaLocal(real([]), copia, red(true)).ejecutar('a');
    expect(await new ObtenerRecetaConCopiaLocal(real(new ErrorDeRed()), copia, red(false)).ejecutar('a')).toEqual([]);
  });

  it('sin internet y sin copia falla', async () => {
    await expect(new ObtenerRecetaConCopiaLocal(real(receta), new Copia(), red(false)).ejecutar('a')).rejects.toBeInstanceOf(ErrorDeRed);
  });
});

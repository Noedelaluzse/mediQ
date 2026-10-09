import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { ErrorDeRed } from '@/shared/kernel/red';

import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { ConsultaDeMedico, ResumenDeConsultas } from '../domain/Consultas';
import { ConsultasDeMedicosConCopiaLocal } from './ConsultasDeMedicosConCopiaLocal';
import { MedicosConCopiaLocal } from './MedicosConCopiaLocal';

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

const solis: Medico = { id: 'm1', nombreCompleto: 'Dra. Solís', especialidad: 'cardiologia', telefono: '998 555 0142', cedula: '123', notas: 'Lunes' };
const ruiz: Medico = { id: 'm2', nombreCompleto: 'Dr. Ruiz', especialidad: 'medicina-general' };

class Medicos implements MedicosRepository {
  llamadas: string[] = [];
  falla: unknown = null;
  async listar() {
    this.llamadas.push('listar');
    if (this.falla) throw this.falla;
    return [solis, ruiz];
  }
  async obtener(id: string) {
    this.llamadas.push(`obtener:${id}`);
    return id === 'm1' ? solis : null;
  }
  async guardar() {
    this.llamadas.push('guardar');
  }
  async contarConsultas() {
    return 3;
  }
  async eliminar() {
    this.llamadas.push('eliminar');
  }
}

describe('MedicosConCopiaLocal', () => {
  it('con internet lista lo real y guarda la copia; sin internet lista la copia', async () => {
    const copia = new Copia();
    expect(await new MedicosConCopiaLocal(new Medicos(), copia, red(true)).listar()).toEqual([solis, ruiz]);
    const real = new Medicos();
    expect(await new MedicosConCopiaLocal(real, copia, red(false)).listar()).toEqual([solis, ruiz]);
    expect(real.llamadas).toEqual([]);
  });

  it('sin internet y sin copia falla', async () => {
    await expect(new MedicosConCopiaLocal(new Medicos(), new Copia(), red(false)).listar()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  describe('detalle de un médico sin internet (F053)', () => {
    it('sin internet, obtener lo busca en la lista copiada (con todos sus datos)', async () => {
      const copia = new Copia();
      await new MedicosConCopiaLocal(new Medicos(), copia, red(true)).listar();
      const real = new Medicos();
      const m = new MedicosConCopiaLocal(real, copia, red(false));
      expect(await m.obtener('m1')).toEqual(solis);
      expect(await m.obtener('m2')).toEqual(ruiz);
      expect(real.llamadas).toEqual([]);
    });

    it('sin internet, un médico que no está en la copia no existe (null)', async () => {
      const copia = new Copia();
      await new MedicosConCopiaLocal(new Medicos(), copia, red(true)).listar();
      expect(await new MedicosConCopiaLocal(new Medicos(), copia, red(false)).obtener('fantasma')).toBeNull();
    });

    it('sin internet y sin copia obtener falla con ErrorDeRed', async () => {
      await expect(new MedicosConCopiaLocal(new Medicos(), new Copia(), red(false)).obtener('m1')).rejects.toBeInstanceOf(ErrorDeRed);
    });
  });

  it('lo demás (obtener, guardar, contar, eliminar) pasa directo al repositorio real', async () => {
    const real = new Medicos();
    const m = new MedicosConCopiaLocal(real, new Copia(), red(true));
    expect(await m.obtener('m1')).toEqual(solis);
    await m.guardar(solis);
    expect(await m.contarConsultas('m1')).toBe(3);
    await m.eliminar('m1');
    expect(real.llamadas).toEqual(['obtener:m1', 'guardar', 'eliminar']);
  });
});

const resumen = new Map<string, ResumenDeConsultas>([
  ['m1', { consultas: 4, ultimaVisita: new Date(2026, 9, 2, 10, 0), lugares: ['Clínica del Sureste', 'Hospital Ángeles'] }],
  ['m2', { consultas: 1, lugares: [] }],
]);

const consultasDeSolis: ConsultaDeMedico[] = [
  { id: 'c2', fecha: new Date(2026, 9, 2, 10, 0), lugar: 'Clínica del Sureste', motivo: 'Revisión' },
  { id: 'c1', fecha: new Date(2026, 8, 1, 9, 30) },
];

class ConsultasDeMedicos implements ConsultasDeMedicosRepository {
  llamadas = 0;
  async resumenPorMedico() {
    this.llamadas++;
    return resumen;
  }
  async resumenBasicoPorMedico() {
    return resumen;
  }
  llamadasDeMedico = 0;
  async deMedico(id: string) {
    this.llamadasDeMedico++;
    return id === 'm1' ? consultasDeSolis : [];
  }
  llamadasTotales = 0;
  async totales() {
    this.llamadasTotales++;
    return { consultas: 9, conReceta: 2 };
  }
}

describe('ConsultasDeMedicosConCopiaLocal', () => {
  it('el resumen por médico se copia con sus fechas y se lee sin internet', async () => {
    const copia = new Copia();
    expect(await new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(true)).resumenPorMedico()).toEqual(resumen);
    const real = new ConsultasDeMedicos();
    const sinRed = await new ConsultasDeMedicosConCopiaLocal(real, copia, red(false)).resumenPorMedico();
    expect(real.llamadas).toBe(0);
    expect(sinRed).toEqual(resumen);
    expect(sinRed.get('m1')?.ultimaVisita).toBeInstanceOf(Date);
    expect(sinRed.get('m2')?.ultimaVisita).toBeUndefined();
  });

  it('sin internet y sin copia falla', async () => {
    await expect(new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), new Copia(), red(false)).resumenPorMedico()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  describe('consultas de un médico (F053: el detalle del médico sin internet)', () => {
    it('con internet se leen y se copian; sin internet se devuelven las copiadas, con sus fechas de verdad', async () => {
      const copia = new Copia();
      expect(await new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(true)).deMedico('m1')).toEqual(consultasDeSolis);
      const real = new ConsultasDeMedicos();
      const sinRed = await new ConsultasDeMedicosConCopiaLocal(real, copia, red(false)).deMedico('m1');
      expect(real.llamadasDeMedico).toBe(0);
      expect(sinRed).toEqual(consultasDeSolis);
      expect(sinRed[0].fecha).toBeInstanceOf(Date);
      expect(sinRed[1].lugar).toBeUndefined();
    });

    it('cada médico tiene su propia copia', async () => {
      const copia = new Copia();
      const c = new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(true));
      await c.deMedico('m1');
      await c.deMedico('m2');
      const sinRed = new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(false));
      expect(await sinRed.deMedico('m2')).toEqual([]);
      expect((await sinRed.deMedico('m1')).length).toBe(2);
    });

    it('un médico cuyo detalle nunca se abrió con internet no tiene copia: falla con ErrorDeRed', async () => {
      await expect(new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), new Copia(), red(false)).deMedico('m1')).rejects.toBeInstanceOf(ErrorDeRed);
    });

    it('una copia dañada se ignora', async () => {
      const copia = new Copia();
      copia.datos.set('consultas-de-medico:m1', '{no es json');
      await expect(new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(false)).deMedico('m1')).rejects.toBeInstanceOf(ErrorDeRed);
    });
  });

  describe('totales del Perfil (F053: sin internet se ve el último total, no un 0)', () => {
    it('con internet los lee y deja la copia; sin internet devuelve esa copia sin llamar al servidor', async () => {
      const copia = new Copia();
      expect(await new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(true)).totales()).toEqual({ consultas: 9, conReceta: 2 });
      const real = new ConsultasDeMedicos();
      const sinRed = await new ConsultasDeMedicosConCopiaLocal(real, copia, red(false)).totales();
      expect(sinRed).toEqual({ consultas: 9, conReceta: 2 });
      expect(real.llamadasTotales).toBe(0);
    });

    it('sin internet y sin copia falla con ErrorDeRed (el Perfil no inventa ceros)', async () => {
      await expect(new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), new Copia(), red(false)).totales()).rejects.toBeInstanceOf(ErrorDeRed);
    });

    it('una copia dañada se ignora', async () => {
      const copia = new Copia();
      copia.datos.set('totales-de-consultas', '{no es json');
      await expect(new ConsultasDeMedicosConCopiaLocal(new ConsultasDeMedicos(), copia, red(false)).totales()).rejects.toBeInstanceOf(ErrorDeRed);
    });
  });
});

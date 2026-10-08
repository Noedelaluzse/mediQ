import { describe, expect, it } from 'vitest';

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { ErrorDeRed } from '@/shared/kernel/red';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';
import { DatosDeSaludConCopiaLocal } from './DatosDeSaludConCopiaLocal';

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

const salud: DatosDeSalud = {
  nacimiento: '1990-05-17',
  sexo: 'mujer',
  tipoDeSangre: 'AB-',
  alergias: { sinConocidas: false, items: ['Polen', 'Nueces'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

class Real implements DatosDeSaludRepository {
  lecturas = 0;
  guardados: DatosDeSalud[] = [];
  async obtener() {
    this.lecturas++;
    return salud;
  }
  async guardar(d: DatosDeSalud) {
    this.guardados.push(d);
  }
}

describe('DatosDeSaludConCopiaLocal (F053: «Mi salud» en el Perfil sin internet)', () => {
  it('con internet lee del servidor y deja la copia; sin internet devuelve esa copia sin llamar al servidor', async () => {
    const copia = new Copia();
    expect(await new DatosDeSaludConCopiaLocal(new Real(), copia, red(true)).obtener()).toEqual(salud);
    const real = new Real();
    const sinRed = await new DatosDeSaludConCopiaLocal(real, copia, red(false)).obtener();
    expect(sinRed).toEqual(salud);
    expect(real.lecturas).toBe(0);
  });

  it('la copia conserva todo: nacimiento, sexo, sangre y las dos listas de alergias', async () => {
    const copia = new Copia();
    await new DatosDeSaludConCopiaLocal(new Real(), copia, red(true)).obtener();
    const sinRed = await new DatosDeSaludConCopiaLocal(new Real(), copia, red(false)).obtener();
    expect(sinRed.alergias.items).toEqual(['Polen', 'Nueces']);
    expect(sinRed.alergiasAMedicamentos.sinConocidas).toBe(true);
    expect(sinRed.tipoDeSangre).toBe('AB-');
  });

  it('un perfil sin datos también se copia (no se confunde con «sin copia»)', async () => {
    const copia = new Copia();
    const vacio: DatosDeSaludRepository = { obtener: async () => SIN_DATOS, guardar: async () => undefined };
    await new DatosDeSaludConCopiaLocal(vacio, copia, red(true)).obtener();
    expect(await new DatosDeSaludConCopiaLocal(new Real(), copia, red(false)).obtener()).toEqual(SIN_DATOS);
  });

  it('sin internet y sin copia falla con ErrorDeRed', async () => {
    await expect(new DatosDeSaludConCopiaLocal(new Real(), new Copia(), red(false)).obtener()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it('una copia dañada o con forma rara se ignora', async () => {
    for (const texto of ['{no es json', '[]', '{"alergias":3}']) {
      const copia = new Copia();
      copia.datos.set('datos-de-salud', texto);
      await expect(new DatosDeSaludConCopiaLocal(new Real(), copia, red(false)).obtener()).rejects.toBeInstanceOf(ErrorDeRed);
    }
  });

  it('guardar pasa al servidor y deja la copia al día (se puede guardar y quedarse sin internet enseguida)', async () => {
    const copia = new Copia();
    const real = new Real();
    const c = new DatosDeSaludConCopiaLocal(real, copia, red(true));
    const nuevos: DatosDeSalud = { ...salud, sexo: 'hombre', alergias: { sinConocidas: true, items: [] } };
    await c.guardar(nuevos);
    expect(real.guardados).toEqual([nuevos]);
    expect(await new DatosDeSaludConCopiaLocal(new Real(), copia, red(false)).obtener()).toEqual(nuevos);
  });

  it('si falla guardar la copia, guardar no falla (es solo una copia)', async () => {
    const copia: CopiaLocal = { guardar: async () => Promise.reject(new Error('disco')), leer: async () => null, limpiar: async () => undefined };
    await expect(new DatosDeSaludConCopiaLocal(new Real(), copia, red(true)).guardar(salud)).resolves.toBeUndefined();
  });
});

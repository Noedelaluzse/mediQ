import { describe, expect, it } from 'vitest';

import { claveDeLugar, type Lugar } from '@/modules/medicos/domain/Lugar';
import type { LugaresRepository } from '@/modules/medicos/domain/LugaresRepository';
import type { Medico } from '@/modules/medicos/domain/Medico';
import type { MedicosRepository } from '@/modules/medicos/domain/MedicosRepository';

import { LugaresParaConsultaDeMedicos, MedicosParaConsultaDeMedicos } from './adaptadoresDeMedicos';

class Medicos implements MedicosRepository {
  datos = new Map<string, Medico>();
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async guardar(m: Medico) {
    this.datos.set(m.id, m);
  }
  async contarConsultas() {
    return 0;
  }
  async eliminar() {}
}
class Lugares implements LugaresRepository {
  datos = new Map<string, Lugar>();
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async buscarPorClave(c: string) {
    return [...this.datos.values()].find((l) => claveDeLugar(l.nombre) === c) ?? null;
  }
  async crear(l: Lugar) {
    this.datos.set(l.id, l);
  }
  async renombrar() {}
  async contarConsultas() {
    return 0;
  }
  async consultasPorLugar() {
    return new Map<string, number>();
  }
  async eliminar() {}
}

describe('MedicosParaConsultaDeMedicos', () => {
  const montar = () => {
    const repo = new Medicos();
    return { repo, puerto: new MedicosParaConsultaDeMedicos(repo, () => 'nuevo-1') };
  };

  it('con id de un médico guardado lo reutiliza', async () => {
    const { repo, puerto } = montar();
    repo.datos.set('m1', { id: 'm1', nombreCompleto: 'Dra. Solís', especialidad: 'cardiologia' });
    const r = await puerto.asegurar({ medicoId: 'm1', nombre: 'Dra. Solís', especialidad: 'cardiologia' });
    expect(r.ok && r.value).toEqual({ id: 'm1', nombre: 'Dra. Solís' });
    expect(repo.datos.size).toBe(1);
  });

  it('con un nombre nuevo crea al médico con su especialidad, teléfono y cédula', async () => {
    const { repo, puerto } = montar();
    const r = await puerto.asegurar({ nombre: 'Dr. Pech', especialidad: 'medicina-general', telefono: '123', cedula: '9' });
    expect(r.ok && r.value).toEqual({ id: 'nuevo-1', nombre: 'Dr. Pech' });
    expect(repo.datos.get('nuevo-1')).toMatchObject({ especialidad: 'medicina-general', telefono: '123', cedula: '9' });
  });

  it('si ya hay un médico con ese nombre (sin importar mayúsculas ni acentos) lo reutiliza', async () => {
    const { repo, puerto } = montar();
    repo.datos.set('m1', { id: 'm1', nombreCompleto: 'Dra. Mariana Solís', especialidad: 'cardiologia' });
    const r = await puerto.asegurar({ nombre: 'dra. mariana solis', especialidad: 'cardiologia' });
    expect(r.ok && r.value.id).toBe('m1');
    expect(repo.datos.size).toBe(1);
  });

  it('un id que ya no existe se trata como médico nuevo por nombre', async () => {
    const { repo, puerto } = montar();
    const r = await puerto.asegurar({ medicoId: 'borrado', nombre: 'Dr. Nuevo', especialidad: 'otra' });
    expect(r.ok && r.value.id).toBe('nuevo-1');
    expect(repo.datos.has('nuevo-1')).toBe(true);
  });
});

describe('LugaresParaConsultaDeMedicos', () => {
  it('reutiliza un lugar existente aunque cambien mayúsculas, acentos o espacios', async () => {
    const repo = new Lugares();
    repo.datos.set('l1', { id: 'l1', nombre: 'Clínica del Sureste' });
    const r = await new LugaresParaConsultaDeMedicos(repo, () => 'x').asegurar('  clinica DEL sureste ');
    expect(r.ok && r.value).toEqual({ id: 'l1', nombre: 'Clínica del Sureste' });
    expect(repo.datos.size).toBe(1);
  });

  it('crea el lugar si no existe', async () => {
    const repo = new Lugares();
    const r = await new LugaresParaConsultaDeMedicos(repo, () => 'nuevo-1').asegurar('Hospital Morelos');
    expect(r.ok && r.value).toEqual({ id: 'nuevo-1', nombre: 'Hospital Morelos' });
    expect(repo.datos.get('nuevo-1')?.nombre).toBe('Hospital Morelos');
  });
});

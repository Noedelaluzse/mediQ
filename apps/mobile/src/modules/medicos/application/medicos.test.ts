import { describe, expect, it } from 'vitest';

import { MedicoConConsultasError, MedicoNoEncontradoError } from '../domain/errors';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';
import { EliminarMedico } from './EliminarMedico';
import { GuardarMedico } from './GuardarMedico';
import { ListarMedicos } from './ListarMedicos';
import { ObtenerMedico } from './ObtenerMedico';

class MedicosEnMemoria implements MedicosRepository {
  datos = new Map<string, Medico>();
  consultas = new Map<string, number>();
  eliminados: string[] = [];
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async guardar(m: Medico) {
    this.datos.set(m.id, m);
  }
  async contarConsultas(id: string) {
    return this.consultas.get(id) ?? 0;
  }
  async eliminar(id: string) {
    this.eliminados.push(id);
    this.datos.delete(id);
  }
}

const nuevo = { nombre: 'Dra. Mariana Solís', especialidad: 'cardiologia', telefono: '998 555 0142' };

describe('GuardarMedico (RF-20)', () => {
  it('crea un médico nuevo con un id generado', async () => {
    const repo = new MedicosEnMemoria();
    const r = await new GuardarMedico(repo, () => 'id-1').ejecutar(nuevo);
    expect(r.ok && r.value.id).toBe('id-1');
    expect(repo.datos.get('id-1')?.nombreCompleto).toBe('Dra. Mariana Solís');
  });

  it('sin nombre no guarda nada', async () => {
    const repo = new MedicosEnMemoria();
    const r = await new GuardarMedico(repo, () => 'id-1').ejecutar({ ...nuevo, nombre: ' ' });
    expect(r.ok).toBe(false);
    expect(repo.datos.size).toBe(0);
  });

  it('edita un médico existente conservando su id', async () => {
    const repo = new MedicosEnMemoria();
    const guardar = new GuardarMedico(repo, () => 'id-1');
    await guardar.ejecutar(nuevo);
    const r = await guardar.ejecutar({ ...nuevo, id: 'id-1', nombre: 'Dra. M. Solís' });
    expect(r.ok && r.value.id).toBe('id-1');
    expect(repo.datos.size).toBe(1);
    expect(repo.datos.get('id-1')?.nombreCompleto).toBe('Dra. M. Solís');
  });

  it('editar un médico que no existe devuelve MedicoNoEncontradoError', async () => {
    const repo = new MedicosEnMemoria();
    const r = await new GuardarMedico(repo, () => 'x').ejecutar({ ...nuevo, id: 'fantasma' });
    expect(!r.ok && r.error).toBeInstanceOf(MedicoNoEncontradoError);
  });
});

describe('ListarMedicos y ObtenerMedico', () => {
  it('lista los médicos ordenados por nombre, sin distinguir mayúsculas ni acentos', async () => {
    const repo = new MedicosEnMemoria();
    let n = 0;
    const guardar = new GuardarMedico(repo, () => `id-${++n}`);
    await guardar.ejecutar({ ...nuevo, nombre: 'Dr. Pech' });
    await guardar.ejecutar({ ...nuevo, nombre: 'Dra. Ana Canul' });
    await guardar.ejecutar({ ...nuevo, nombre: 'Dr. Álvaro Díaz' });
    const nombres = (await new ListarMedicos(repo).ejecutar()).map((m) => m.nombreCompleto);
    expect(nombres).toEqual(['Dr. Álvaro Díaz', 'Dr. Pech', 'Dra. Ana Canul']);
  });

  it('obtener devuelve null si no existe', async () => {
    expect(await new ObtenerMedico(new MedicosEnMemoria()).ejecutar('nada')).toBeNull();
  });
});

describe('EliminarMedico', () => {
  it('elimina un médico sin consultas', async () => {
    const repo = new MedicosEnMemoria();
    await new GuardarMedico(repo, () => 'id-1').ejecutar(nuevo);
    const r = await new EliminarMedico(repo).ejecutar('id-1');
    expect(r.ok).toBe(true);
    expect(repo.eliminados).toEqual(['id-1']);
  });

  it('si tiene consultas, no lo elimina (decisión del usuario)', async () => {
    const repo = new MedicosEnMemoria();
    await new GuardarMedico(repo, () => 'id-1').ejecutar(nuevo);
    repo.consultas.set('id-1', 3);
    const r = await new EliminarMedico(repo).ejecutar('id-1');
    expect(!r.ok && r.error).toBeInstanceOf(MedicoConConsultasError);
    expect(repo.eliminados).toEqual([]);
    expect(repo.datos.has('id-1')).toBe(true);
  });

  it('el error dice cuántas consultas tiene', async () => {
    const repo = new MedicosEnMemoria();
    await new GuardarMedico(repo, () => 'id-1').ejecutar(nuevo);
    repo.consultas.set('id-1', 3);
    const r = await new EliminarMedico(repo).ejecutar('id-1');
    expect(!r.ok && (r.error as MedicoConConsultasError).consultas).toBe(3);
  });

  it('eliminar uno que no existe devuelve MedicoNoEncontradoError', async () => {
    const r = await new EliminarMedico(new MedicosEnMemoria()).ejecutar('fantasma');
    expect(!r.ok && r.error).toBeInstanceOf(MedicoNoEncontradoError);
  });
});

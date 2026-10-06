import { describe, expect, it } from 'vitest';

import type { BorradorDeConsulta } from '../domain/Borrador';
import type { BorradorRepository } from '../domain/BorradorRepository';
import { DescartarBorrador } from './DescartarBorrador';
import { GuardarBorrador } from './GuardarBorrador';
import { RecuperarBorrador } from './RecuperarBorrador';

class Repo implements BorradorRepository {
  actual: BorradorDeConsulta | null = null;
  async leer() {
    return this.actual;
  }
  async guardar(b: BorradorDeConsulta) {
    this.actual = b;
  }
  async borrar() {
    this.actual = null;
  }
}

const base: BorradorDeConsulta = {
  fecha: '2026-10-05T09:30:00.000Z',
  hora: '2026-10-05T09:30:00.000Z',
  especialidad: 'medicina-general',
  lugar: '',
  consultorio: '',
  medicoNombre: '',
  medicoTelefono: '',
  medicoCedula: '',
  motivo: '',
  notasDelMedico: '',
  indicaciones: [],
  proximaCita: null,
};

describe('GuardarBorrador (RF-14)', () => {
  it('guarda lo escrito y avisa que quedó guardado', async () => {
    const repo = new Repo();
    const r = await new GuardarBorrador(repo).ejecutar({ ...base, motivo: 'Revisión' });
    expect(r).toBe('guardado');
    expect(repo.actual?.motivo).toBe('Revisión');
  });

  it('reemplaza el borrador anterior (hay uno solo)', async () => {
    const repo = new Repo();
    const uc = new GuardarBorrador(repo);
    await uc.ejecutar({ ...base, motivo: 'uno' });
    await uc.ejecutar({ ...base, motivo: 'dos' });
    expect(repo.actual?.motivo).toBe('dos');
  });

  it('si el formulario quedó vacío no guarda y borra el borrador viejo', async () => {
    const repo = new Repo();
    repo.actual = { ...base, motivo: 'viejo' };
    const r = await new GuardarBorrador(repo).ejecutar(base);
    expect(r).toBe('descartado');
    expect(repo.actual).toBeNull();
  });
});

describe('RecuperarBorrador (HU-04)', () => {
  it('devuelve el borrador guardado', async () => {
    const repo = new Repo();
    repo.actual = { ...base, motivo: 'Revisión' };
    expect((await new RecuperarBorrador(repo).ejecutar())?.motivo).toBe('Revisión');
  });

  it('sin borrador devuelve null', async () => {
    expect(await new RecuperarBorrador(new Repo()).ejecutar()).toBeNull();
  });
});

describe('DescartarBorrador', () => {
  it('borra el borrador', async () => {
    const repo = new Repo();
    repo.actual = { ...base, motivo: 'x' };
    await new DescartarBorrador(repo).ejecutar();
    expect(repo.actual).toBeNull();
  });
});

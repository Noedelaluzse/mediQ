import { describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';
import { GuardarDatosDeSalud } from './GuardarDatosDeSalud';
import { ObtenerDatosDeSalud } from './ObtenerDatosDeSalud';

class Repo implements DatosDeSaludRepository {
  constructor(public datos: DatosDeSalud = SIN_DATOS) {}
  guardados = 0;
  async obtener() {
    return this.datos;
  }
  async guardar(d: DatosDeSalud) {
    this.guardados++;
    this.datos = d;
  }
}

const hoy = () => new Date(2026, 9, 6);

describe('ObtenerDatosDeSalud', () => {
  it('devuelve lo guardado', async () => {
    const d: DatosDeSalud = { ...SIN_DATOS, sexo: 'mujer' };
    expect(await new ObtenerDatosDeSalud(new Repo(d)).ejecutar()).toEqual(d);
  });
});

describe('GuardarDatosDeSalud', () => {
  it('valida y guarda los datos normalizados', async () => {
    const repo = new Repo();
    const r = await new GuardarDatosDeSalud(repo, hoy).ejecutar({ ...SIN_DATOS, nacimiento: '1990-03-14', alergias: { sinConocidas: false, items: [' Polen '] } });
    expect(r.ok).toBe(true);
    expect(repo.datos.alergias.items).toEqual(['Polen']);
    expect(repo.guardados).toBe(1);
  });

  it('si algo es inválido no guarda nada y devuelve el error', async () => {
    const repo = new Repo();
    const r = await new GuardarDatosDeSalud(repo, hoy).ejecutar({ ...SIN_DATOS, nacimiento: '2030-01-01' });
    expect(r.ok).toBe(false);
    expect(repo.guardados).toBe(0);
  });
});

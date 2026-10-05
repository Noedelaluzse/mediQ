import { describe, expect, it } from 'vitest';

import type { Cuenta } from '../domain/Cuenta';
import type { CuentasRepository } from '../domain/CuentasRepository';
import { RegistrarCuenta } from './RegistrarCuenta';

class CuentasEnMemoria implements CuentasRepository {
  cuentas = new Map<string, Cuenta>();
  creaciones = 0;
  async buscar(usuarioId: string) {
    return this.cuentas.get(usuarioId) ?? null;
  }
  async crear(cuenta: Cuenta) {
    this.creaciones += 1;
    this.cuentas.set(cuenta.usuarioId, cuenta);
  }
}

const ana = { usuarioId: 'u1', googleSub: 'g-1', email: 'ana@mail.com', nombre: 'Ana Pérez' };

describe('RegistrarCuenta', () => {
  it('la primera vez crea la cuenta con su perfil propio', async () => {
    const repo = new CuentasEnMemoria();
    const r = await new RegistrarCuenta(repo).ejecutar(ana);

    expect(r.primeraVez).toBe(true);
    expect(r.cuenta.usuarioId).toBe('u1');
    expect(r.cuenta.perfilPropio.esPropio).toBe(true);
    expect(r.cuenta.perfilPropio.nombreCompleto).toBe('Ana Pérez');
    expect(repo.creaciones).toBe(1);
  });

  it('si la cuenta ya existe no la vuelve a crear', async () => {
    const repo = new CuentasEnMemoria();
    const caso = new RegistrarCuenta(repo);
    await caso.ejecutar(ana);

    const segunda = await caso.ejecutar(ana);

    expect(segunda.primeraVez).toBe(false);
    expect(repo.creaciones).toBe(1);
  });

  it('cada usuario tiene su propia cuenta', async () => {
    const repo = new CuentasEnMemoria();
    const caso = new RegistrarCuenta(repo);
    await caso.ejecutar(ana);
    const luis = await caso.ejecutar({ ...ana, usuarioId: 'u2', googleSub: 'g-2', email: 'luis@mail.com', nombre: 'Luis' });

    expect(luis.primeraVez).toBe(true);
    expect(repo.cuentas.size).toBe(2);
  });

  it('si Google no trae nombre usa la parte local del correo', async () => {
    const repo = new CuentasEnMemoria();
    const r = await new RegistrarCuenta(repo).ejecutar({ ...ana, nombre: '   ' });
    expect(r.cuenta.perfilPropio.nombreCompleto).toBe('ana');
  });
});

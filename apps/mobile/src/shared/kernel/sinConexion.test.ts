import { describe, expect, it } from 'vitest';

import { MENSAJE_SIN_CONEXION, motivoSinEdicion } from './sinConexion';

describe('motivoSinEdicion (por qué no se puede editar sin internet)', () => {
  it('con internet no hay motivo: se puede editar', () => {
    expect(motivoSinEdicion(true)).toBeNull();
  });

  it('sin internet explica qué sí se puede y qué no, en lenguaje simple', () => {
    const m = motivoSinEdicion(false);
    expect(m).toBe(MENSAJE_SIN_CONEXION);
    expect(m).toContain('Sin conexión');
    expect(m).toMatch(/editar/);
    expect(m).toMatch(/internet/);
  });
});

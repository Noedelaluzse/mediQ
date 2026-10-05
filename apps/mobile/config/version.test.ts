import { describe, expect, it } from 'vitest';

import { calcularVersion, obtenerVersion } from './version';

describe('calcularVersion (1.<features>.<resto>)', () => {
  it('sin historial es 1.0.0', () => {
    expect(calcularVersion([])).toMatchObject({ version: '1.0.0', features: 0, otros: 0, compilacion: 0 });
  });

  it('cada feat sube el número del medio y lo demás el último', () => {
    const r = calcularVersion(['feat: a', 'feat(medicos): b', 'fix: c', 'docs: d', 'chore(x): e']);
    expect(r).toMatchObject({ version: '1.2.3', features: 2, otros: 3, compilacion: 5 });
  });

  it('reconoce feat con alcance, con ! y en mayúsculas', () => {
    expect(calcularVersion(['feat!: a', 'feat(x)!: b', 'Feat: c']).features).toBe(3);
  });

  it('los commits viejos "Fnnn:" cuentan como feature, una sola vez por id', () => {
    const r = calcularVersion(['F005: borrar', 'F005: prueba', 'F005: aviso', 'F004: perfil', 'feat(consultas): registrar (F009, RF-10)']);
    expect(r.features).toBe(3);
    expect(r.otros).toBe(0);
  });

  it('un feat con id ya contado no se cuenta otra vez', () => {
    expect(calcularVersion(['F006: guardar', 'feat(medicos): guardar (F006, RF-20)']).features).toBe(1);
  });

  it('un feat sin id cuenta cada vez', () => {
    expect(calcularVersion(['feat: a', 'feat: b']).features).toBe(2);
  });

  it('los mensajes sin prefijo suman al último número', () => {
    expect(calcularVersion(['Add troubleshooting guide', 'Set bundle ID'])).toMatchObject({ version: '1.0.2', otros: 2 });
  });

  it('ignora los commits de fusión (Merge ...) y las líneas vacías', () => {
    const r = calcularVersion(['Merge pull request #19 from x/y', '', 'fix: a']);
    expect(r).toMatchObject({ version: '1.0.1', compilacion: 1 });
  });
});

describe('obtenerVersion', () => {
  it('usa git cuando está disponible', () => {
    const r = obtenerVersion({ git: () => ({ asuntos: ['feat: a', 'fix: b'], commit: 'a1b2c3d' }), leer: () => null });
    expect(r).toMatchObject({ version: '1.1.1', commit: 'a1b2c3d', compilacion: 2 });
  });

  it('si git falla (por ejemplo en la copia sin .git) lee el archivo generado', () => {
    const generado = { version: '1.9.4', commit: 'beef123', compilacion: 40 };
    const r = obtenerVersion({
      git: () => {
        throw new Error('not a git repository');
      },
      leer: () => generado,
    });
    expect(r).toEqual(generado);
  });

  it('si no hay git ni archivo, 1.0.0 sin hash', () => {
    const r = obtenerVersion({
      git: () => {
        throw new Error('x');
      },
      leer: () => null,
    });
    expect(r).toEqual({ version: '1.0.0', commit: undefined, compilacion: 1 });
  });
});

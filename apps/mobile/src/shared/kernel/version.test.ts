import { describe, expect, it } from 'vitest';

import { textoDeVersion } from './version';

describe('textoDeVersion', () => {
  it('muestra versión y hash corto', () => {
    expect(textoDeVersion('1.10.14', 'a1b2c3d')).toBe('versión 1.10.14 (a1b2c3d)');
  });
  it('sin hash muestra solo la versión', () => {
    expect(textoDeVersion('1.10.14')).toBe('versión 1.10.14');
  });
  it('sin versión usa 1.0.0', () => {
    expect(textoDeVersion(undefined, undefined)).toBe('versión 1.0.0');
  });
});

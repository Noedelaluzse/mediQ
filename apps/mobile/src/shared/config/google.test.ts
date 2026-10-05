import { describe, expect, it } from 'vitest';

import { urlSchemeDeGoogle } from '../../../config/google';

describe('urlSchemeDeGoogle', () => {
  it('invierte el ID de cliente de iOS', () => {
    expect(urlSchemeDeGoogle('123-abc.apps.googleusercontent.com')).toBe('com.googleusercontent.apps.123-abc');
  });

  it('rechaza un ID que no es de Google', () => {
    expect(() => urlSchemeDeGoogle('abc')).toThrow();
    expect(() => urlSchemeDeGoogle('')).toThrow();
  });
});

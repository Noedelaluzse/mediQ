import { describe, expect, it } from 'vitest';

import { destinoPostLogin } from './destinoPostLogin';

describe('destinoPostLogin', () => {
  it('la primera vez va al aviso de privacidad', () => {
    expect(destinoPostLogin({ primeraVez: true })).toBe('/privacidad');
  });

  it('después va al diario', () => {
    expect(destinoPostLogin({ primeraVez: false })).toBe('/');
  });
});

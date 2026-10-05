import { describe, expect, it } from 'vitest';

import { destinoPostLogin } from './destinoPostLogin';

describe('destinoPostLogin', () => {
  it('con consentimiento pendiente va al aviso de privacidad', () => {
    expect(destinoPostLogin({ consentimientoPendiente: true })).toBe('/privacidad');
  });

  it('con el consentimiento al día va al diario', () => {
    expect(destinoPostLogin({ consentimientoPendiente: false })).toBe('/');
  });
});

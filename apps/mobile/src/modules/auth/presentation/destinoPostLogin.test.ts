import { describe, expect, it } from 'vitest';

import { destinoPostLogin, rutaInicialDeAcceso } from './destinoPostLogin';

describe('destinoPostLogin', () => {
  it('con consentimiento pendiente va al aviso de privacidad', () => {
    expect(destinoPostLogin({ consentimientoPendiente: true })).toBe('/privacidad');
  });

  it('con el consentimiento al día va al diario', () => {
    expect(destinoPostLogin({ consentimientoPendiente: false })).toBe('/');
  });
});

describe('rutaInicialDeAcceso (con qué pantalla abre la app cuando no hay sesión activa)', () => {
  it('con la sesión iniciada pero textos legales nuevos por aceptar, abre la aceptación (no el login)', () => {
    expect(rutaInicialDeAcceso('avisoPendiente')).toBe('privacidad');
  });

  it('sin sesión abre el login', () => {
    expect(rutaInicialDeAcceso('sinSesion')).toBe('login');
  });

  it('cualquier otro estado abre el login (el grupo de acceso solo se ve sin sesión o con aviso pendiente)', () => {
    expect(rutaInicialDeAcceso('cargando')).toBe('login');
    expect(rutaInicialDeAcceso('activa')).toBe('login');
  });
});

import { describe, expect, it } from 'vitest';

import { aDocumentoConsentimiento, deDocumentoConsentimiento } from './documentoConsentimiento';

describe('documento de consentimiento en Firestore', () => {
  it('guarda solo documento y versión (la fecha la pone el servidor)', () => {
    expect(aDocumentoConsentimiento({ documento: 'terminos', version: '1', aceptadoEn: new Date() })).toEqual({
      documento: 'terminos',
      version: '1',
    });
  });

  it('reconstruye el consentimiento con la fecha del servidor', () => {
    const fecha = new Date('2026-10-05T12:00:00Z');
    expect(
      deDocumentoConsentimiento({ documento: 'aviso_privacidad', version: '2', acceptedAt: { toDate: () => fecha } }),
    ).toEqual({ documento: 'aviso_privacidad', version: '2', aceptadoEn: fecha });
  });

  it('ignora documentos desconocidos', () => {
    expect(
      deDocumentoConsentimiento({ documento: 'otro', version: '1', acceptedAt: { toDate: () => new Date() } }),
    ).toBeNull();
  });

  it('tolera una fecha que aún no llegó del servidor', () => {
    const r = deDocumentoConsentimiento({ documento: 'terminos', version: '1', acceptedAt: null });
    expect(r?.documento).toBe('terminos');
  });
});

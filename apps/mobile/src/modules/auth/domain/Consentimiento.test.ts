import { describe, expect, it } from 'vitest';

import { documentosPendientes, idDeConsentimiento, VERSIONES_VIGENTES, type Consentimiento } from './Consentimiento';

const aceptado = (documento: Consentimiento['documento'], version: string): Consentimiento => ({
  documento,
  version,
  aceptadoEn: new Date('2026-10-05T12:00:00Z'),
});

describe('documentosPendientes', () => {
  it('sin consentimientos, ambos documentos están pendientes', () => {
    expect(documentosPendientes([])).toEqual(['aviso_privacidad', 'terminos']);
  });

  it('con la versión vigente de ambos no queda nada pendiente', () => {
    const todos = [
      aceptado('aviso_privacidad', VERSIONES_VIGENTES.aviso_privacidad),
      aceptado('terminos', VERSIONES_VIGENTES.terminos),
    ];
    expect(documentosPendientes(todos)).toEqual([]);
  });

  it('una versión anterior no cuenta: se vuelve a pedir', () => {
    const viejo = [aceptado('aviso_privacidad', '2020-01-01'), aceptado('terminos', VERSIONES_VIGENTES.terminos)];
    expect(documentosPendientes(viejo)).toEqual(['aviso_privacidad']);
  });

  it('si solo aceptó uno, el otro sigue pendiente', () => {
    expect(documentosPendientes([aceptado('terminos', VERSIONES_VIGENTES.terminos)])).toEqual(['aviso_privacidad']);
  });
});

describe('idDeConsentimiento', () => {
  it('es determinista por documento y versión (impide aceptar dos veces lo mismo)', () => {
    expect(idDeConsentimiento('aviso_privacidad', '2026-10-05')).toBe('aviso_privacidad_2026-10-05');
  });
});

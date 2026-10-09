import { describe, expect, it } from 'vitest';

import { textoDeCierreDeSesion } from './avisoDeCierre';

/**
 * AUD-07 / F065: al cerrar sesión se borra lo que vive solo en este teléfono: la cola de consultas sin enviar y, desde F065 (decisión del
 * usuario, 2026-10-08), el borrador de «Nueva consulta». Antes de cerrar se avisa de lo que se va a perder.
 */
describe('textoDeCierreDeSesion (el aviso de «¿Cerrar sesión?»)', () => {
  it('sin nada que perder, solo recuerda que hay que volver a entrar', () => {
    expect(textoDeCierreDeSesion({ sinEnviar: 0, hayBorrador: false })).toBe('Tendrás que volver a entrar con Google.');
  });

  it('con consultas sin enviar, avisa cuántas se pierden (singular y plural)', () => {
    expect(textoDeCierreDeSesion({ sinEnviar: 1, hayBorrador: false })).toBe('Tienes 1 consulta sin enviar (se capturaron sin internet). Si cierras sesión ahora, se perderán.');
    expect(textoDeCierreDeSesion({ sinEnviar: 3, hayBorrador: false })).toBe('Tienes 3 consultas sin enviar (se capturaron sin internet). Si cierras sesión ahora, se perderán.');
  });

  it('con un borrador sin terminar, avisa que se borrará', () => {
    const t = textoDeCierreDeSesion({ sinEnviar: 0, hayBorrador: true });
    expect(t).toMatch(/borrador/i);
    expect(t).toMatch(/Nueva consulta/);
    expect(t).toMatch(/se perder|se borrar/i);
  });

  it('con las dos cosas, las menciona juntas en un solo aviso', () => {
    const t = textoDeCierreDeSesion({ sinEnviar: 2, hayBorrador: true });
    expect(t).toMatch(/2 consultas sin enviar/);
    expect(t).toMatch(/borrador/i);
    expect(t.match(/Si cierras sesión ahora/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it('nunca promete que se conserva algo que se borra', () => {
    for (const sinEnviar of [0, 1, 2]) for (const hayBorrador of [false, true]) {
      expect(textoDeCierreDeSesion({ sinEnviar, hayBorrador })).not.toMatch(/se conserva|se guardar[aá]/i);
    }
  });
});

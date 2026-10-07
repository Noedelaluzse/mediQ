/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DOCUMENTOS, VERSIONES_VIGENTES } from './Consentimiento';

const reglas = readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8');

/** Los ids de recibo que la regla `consentimientoAceptado` exige: `documento_AAAA-MM-DD`. */
const idsExigidos = [...reglas.matchAll(/consents\/((?:aviso_privacidad|terminos)_(\d{4}-\d{2}-\d{2}))\)/g)].map((m) => ({ id: m[1], version: m[2] }));

describe('la regla de consentimiento obligatorio de Firestore (F031) y la versión que pide la app', () => {
  it('exige exactamente un recibo por documento (aviso de privacidad y términos)', () => {
    expect(idsExigidos.map((x) => x.id.replace(/_\d{4}-\d{2}-\d{2}$/, '')).sort()).toEqual([...DOCUMENTOS].sort());
  });

  it('nunca exige una versión MÁS NUEVA que la vigente en la app (si no, la cuenta aceptaría lo que la app pide y Firestore la rechazaría)', () => {
    for (const { id, version } of idsExigidos) {
      const documento = DOCUMENTOS.find((d) => id.startsWith(`${d}_`));
      expect(documento, id).toBeDefined();
      expect(version <= VERSIONES_VIGENTES[documento!], `${id} vs ${VERSIONES_VIGENTES[documento!]}`).toBe(true);
    }
  });

  it('se aplica a las consultas y a lo que cuelga de ellas (indicaciones, receta, foto), pero no al borrado', () => {
    const usos = reglas.match(/allow create, update: if esDueno\(uid\) && consentimientoAceptado\(uid\)/g) ?? [];
    expect(usos).toHaveLength(4);
    expect(reglas).not.toMatch(/allow (read, )?delete: if [^;]*consentimientoAceptado/);
  });
});

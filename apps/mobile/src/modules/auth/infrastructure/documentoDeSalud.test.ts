import { describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { aCambiosDeSalud, deDocumentoDeSalud } from './documentoDeSalud';

const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'hombre',
  tipoDeSangre: 'O-',
  alergias: { sinConocidas: false, items: ['Polen', 'Mariscos'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe('documento del perfil con datos de salud', () => {
  it('los guarda con los nombres del modelo (docs/11)', () => {
    expect(aCambiosDeSalud(completos)).toMatchObject({
      birthDate: '1990-03-14',
      sex: 'male',
      bloodType: 'O-',
      allergies: ['Polen', 'Mariscos'],
      noKnownAllergies: false,
      drugAllergies: [],
      noKnownDrugAllergies: true,
    });
  });

  it('«No lo sé» se guarda como unknown (nombres del modelo) y se lee de vuelta', () => {
    const d: DatosDeSalud = { ...SIN_DATOS, tipoDeSangre: 'desconocido' };
    expect(aCambiosDeSalud(d)).toMatchObject({ bloodType: 'unknown' });
    expect(deDocumentoDeSalud({ bloodType: 'unknown' }).tipoDeSangre).toBe('desconocido');
  });

  it('lo que no se llenó se manda como «borrar campo» (así quitar un dato lo quita de verdad)', () => {
    const c = aCambiosDeSalud(SIN_DATOS) as Record<string, unknown>;
    for (const campo of ['birthDate', 'sex', 'bloodType']) expect(String((c[campo] as { _methodName?: string })?._methodName)).toBe('deleteField');
    expect(c.allergies).toEqual([]);
    expect(c.noKnownAllergies).toBe(false);
  });

  it('un documento sin datos de salud (cuenta de antes) se lee como sin datos', () => {
    expect(deDocumentoDeSalud({ fullName: 'Noé', isSelf: true } as never)).toEqual(SIN_DATOS);
  });

  it('lee lo guardado y lo devuelve igual', () => {
    const doc = { birthDate: '1990-03-14', sex: 'male', bloodType: 'O-', allergies: ['Polen', 'Mariscos'], noKnownAllergies: false, drugAllergies: [], noKnownDrugAllergies: true };
    expect(deDocumentoDeSalud(doc)).toEqual(completos);
  });

  it('un valor dañado se ignora en vez de romper la pantalla', () => {
    const r = deDocumentoDeSalud({ birthDate: 5, sex: 'otro-raro', bloodType: 'Z+', allergies: 'polen', noKnownAllergies: 'si', drugAllergies: [1, 'Penicilina'] } as never);
    expect(r).toEqual({ ...SIN_DATOS, alergiasAMedicamentos: { sinConocidas: false, items: ['Penicilina'] } });
  });
});

import { describe, expect, it } from 'vitest';

import { aDocumentoDeReceta, deDocumentoDeReceta } from './documentoDeReceta';

describe('documentoDeReceta (prescriptions/receta, docs/11)', () => {
  it('guarda cada medicamento con los nombres del modelo; lo ausente va como null', () => {
    expect(aDocumentoDeReceta([{ nombre: 'Losartán', dosis: '50 mg', via: 'Oral' }]).items).toEqual([
      { name: 'Losartán', dose: '50 mg', frequency: null, duration: null, route: 'Oral', instructions: null, remind: false, firstDose: null, remindFrom: null },
    ]);
  });

  it('lee el documento de vuelta, con null como ausente', () => {
    const items = [
      { name: 'Losartán', dose: '50 mg', frequency: null, duration: null, route: 'Oral', instructions: null, remind: false },
      { name: 'Aspirina', remind: false },
    ];
    expect(deDocumentoDeReceta({ items })).toEqual([
      { nombre: 'Losartán', dosis: '50 mg', frecuencia: undefined, duracion: undefined, via: 'Oral', indicaciones: undefined },
      { nombre: 'Aspirina', dosis: undefined, frecuencia: undefined, duracion: undefined, via: undefined, indicaciones: undefined },
    ]);
  });

  it('ignora ítems sin nombre y un documento sin lista', () => {
    expect(deDocumentoDeReceta({ items: [{ name: '  ' }, { name: 'Ok' }] }).map((m) => m.nombre)).toEqual(['Ok']);
    expect(deDocumentoDeReceta({})).toEqual([]);
  });

  it('el recordatorio de toma se guarda en el ítem: remind, firstDose y remindFrom', () => {
    const desde = new Date(2026, 9, 6, 14, 0);
    const [item] = aDocumentoDeReceta([{ nombre: 'Losartán', recordar: true, primeraToma: '08:00', recordarDesde: desde }]).items;
    expect(item).toMatchObject({ remind: true, firstDose: '08:00', remindFrom: desde });
  });

  it('sin recordatorio: remind falso y lo demás null', () => {
    const [item] = aDocumentoDeReceta([{ nombre: 'Losartán' }]).items;
    expect(item).toMatchObject({ remind: false, firstDose: null, remindFrom: null });
  });

  it('lee el recordatorio de vuelta (con fecha de Firestore o Date) y tolera recetas antiguas sin esos campos', () => {
    const desde = new Date(2026, 9, 6, 14, 0);
    const leido = deDocumentoDeReceta({ items: [{ name: 'A', remind: true, firstDose: '08:00', remindFrom: { toDate: () => desde } }, { name: 'B', remind: true, firstDose: '09:00', remindFrom: desde }, { name: 'C' }] });
    expect(leido[0]).toMatchObject({ recordar: true, primeraToma: '08:00', recordarDesde: desde });
    expect(leido[1]).toMatchObject({ recordar: true, primeraToma: '09:00', recordarDesde: desde });
    expect(leido[2].recordar).toBeUndefined();
    expect(leido[2].primeraToma).toBeUndefined();
  });
});

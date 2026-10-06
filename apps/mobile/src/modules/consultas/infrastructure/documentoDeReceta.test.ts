import { describe, expect, it } from 'vitest';

import { aDocumentoDeReceta, deDocumentoDeReceta } from './documentoDeReceta';

describe('documentoDeReceta (prescriptions/receta, docs/11)', () => {
  it('guarda cada medicamento con los nombres del modelo; lo ausente va como null', () => {
    expect(aDocumentoDeReceta([{ nombre: 'Losartán', dosis: '50 mg', via: 'Oral' }]).items).toEqual([
      { name: 'Losartán', dose: '50 mg', frequency: null, duration: null, route: 'Oral', instructions: null, remind: false },
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
});

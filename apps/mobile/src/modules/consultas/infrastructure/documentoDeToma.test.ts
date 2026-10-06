import { describe, expect, it } from 'vitest';

import { aDocumentoDeToma } from './documentoDeToma';

describe('documento de doseLogs', () => {
  it('guarda la dosis con los nombres del modelo (docs/11); sin dosis queda null', () => {
    const programada = new Date(2026, 9, 6, 8, 0);
    const tomada = new Date(2026, 9, 6, 8, 2);
    const base = { tomaId: 'toma-c1-0-202610060800', consultaId: 'c1', indice: 0, medicamento: 'Losartán', programadaPara: programada, tomadaEn: tomada };
    expect(aDocumentoDeToma({ ...base, dosis: '1 tableta' })).toEqual({ visitId: 'c1', itemIndex: 0, medicationName: 'Losartán', dose: '1 tableta', scheduledFor: programada, takenAt: tomada });
    expect(aDocumentoDeToma(base).dose).toBeNull();
  });
});

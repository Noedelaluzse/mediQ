import { describe, expect, it } from 'vitest';

import { aDocumentoDeFoto, deDocumentoDeFoto, rutaDeFotoDeReceta } from './documentoDeFoto';

describe('rutaDeFotoDeReceta', () => {
  it('cuelga del usuario y la consulta, con nombre fijo (una foto por receta)', () => {
    expect(rutaDeFotoDeReceta('u1', 'c9')).toBe('mediq_users/u1/visits/c9/receta.jpg');
  });
});

describe('documentoDeFoto (prescriptions/receta/attachments/foto, docs/11)', () => {
  it('guarda solo la ruta en Storage, nunca una URL', () => {
    const d = aDocumentoDeFoto({ tipoMime: 'image/jpeg', bytes: 1234, ancho: 800, alto: 600 }, 'mediq_users/u1/visits/c9/receta.jpg');
    expect(d).toEqual({ storagePath: 'mediq_users/u1/visits/c9/receta.jpg', mimeType: 'image/jpeg', sizeBytes: 1234, width: 800, height: 600 });
    expect(JSON.stringify(d)).not.toContain('http');
  });

  it('lo ausente va como null y se lee como ausente', () => {
    const d = aDocumentoDeFoto({ tipoMime: 'image/jpeg', bytes: 10 }, 'p');
    expect(d).toMatchObject({ width: null, height: null });
    expect(deDocumentoDeFoto({ ...d })).toEqual({ tipoMime: 'image/jpeg', bytes: 10, ancho: undefined, alto: undefined });
  });

  it('un documento sin ruta o sin tipo no es una foto', () => {
    expect(deDocumentoDeFoto({ mimeType: 'image/jpeg', sizeBytes: 1 })).toBeNull();
    expect(deDocumentoDeFoto({ storagePath: 'p', sizeBytes: 1 })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { aDocumentoDeFoto, claveDeCache, datosDeVersion, deDocumentoDeFoto, prefijoDeCache, rutaDeFotoDeReceta, versionDeFoto } from './documentoDeFoto';

const en = (ms: number) => ({ toMillis: () => ms });

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

describe('versionDeFoto (F051: la caché de la foto se invalida cuando cambia la foto)', () => {
  it('cambia al reemplazar la foto, aunque pese lo mismo', () => {
    const antes = versionDeFoto({ sizeBytes: 500, updatedAt: en(1000) });
    const despues = versionDeFoto({ sizeBytes: 500, updatedAt: en(2000) });
    expect(antes).not.toBe(despues);
  });

  it('es estable: la misma foto da siempre la misma versión', () => {
    expect(versionDeFoto({ sizeBytes: 500, updatedAt: en(1000) })).toBe(versionDeFoto({ sizeBytes: 500, updatedAt: en(1000) }));
  });

  it('una foto anterior a F051 (sin `updatedAt`) usa `createdAt`; sin ninguno, solo el tamaño', () => {
    expect(versionDeFoto({ sizeBytes: 500, createdAt: en(7) })).toBe('500-7-0x0');
    expect(versionDeFoto({ sizeBytes: 500 })).toBe('500-0-0x0');
    expect(versionDeFoto({ sizeBytes: 500, updatedAt: null, createdAt: en(7) })).toBe('500-7-0x0');
  });

  it('recuerda las dimensiones: sin internet se necesitan para dibujar la foto y no se pueden leer de la nube', () => {
    expect(versionDeFoto({ sizeBytes: 500, updatedAt: en(9), width: 1200, height: 1600 })).toBe('500-9-1200x1600');
  });
});

describe('datosDeVersion (lo que se recupera de la copia sin internet)', () => {
  it('devuelve el tamaño y las dimensiones guardadas en la versión', () => {
    expect(datosDeVersion('500-9-1200x1600')).toEqual({ bytes: 500, ancho: 1200, alto: 1600 });
  });

  it('dimensiones desconocidas (0x0) quedan sin definir', () => {
    expect(datosDeVersion('500-7-0x0')).toEqual({ bytes: 500, ancho: undefined, alto: undefined });
  });

  it('una versión que no entiende no inventa datos', () => {
    expect(datosDeVersion('basura')).toBeNull();
    expect(datosDeVersion('')).toBeNull();
  });

});

describe('clave de la caché de fotos', () => {
  it('lleva la cuenta y la consulta, para que otra cuenta nunca lea la foto de esta', () => {
    expect(claveDeCache('u1', 'c9', '500-7-0x0')).toBe('u1_c9_500-7-0x0');
    expect(claveDeCache('u2', 'c9', '500-7')).not.toBe(claveDeCache('u1', 'c9', '500-7'));
  });

  it('solo deja caracteres seguros para un nombre de archivo', () => {
    expect(claveDeCache('u/1', '../c9', '5 0-7')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('el prefijo de una consulta no alcanza a las que empiezan igual', () => {
    expect(claveDeCache('u1', 'c9', '500-7').startsWith(prefijoDeCache('u1', 'c9'))).toBe(true);
    expect(claveDeCache('u1', 'c99', '500-7').startsWith(prefijoDeCache('u1', 'c9'))).toBe(false);
  });
});

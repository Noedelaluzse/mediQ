import { describe, expect, it } from 'vitest';

import { CacheDeFotosEnDisco, type Archivos } from './CacheDeFotosEnDisco';

/** Un disco de mentira: así la lógica de la caché se prueba sin el teléfono. */
class DiscoFalso implements Archivos {
  contenido = new Map<string, Uint8Array>();
  escrituras = 0;
  existe(ruta: string) {
    return this.contenido.has(ruta);
  }
  escribir(ruta: string, bytes: Uint8Array) {
    this.escrituras++;
    this.contenido.set(ruta, bytes);
  }
  borrar(ruta: string) {
    this.contenido.delete(ruta);
  }
  listar(carpeta: string) {
    return [...this.contenido.keys()].filter((r) => r.startsWith(`${carpeta}/`)).map((r) => r.slice(carpeta.length + 1));
  }
  asegurarCarpeta() {}
  uriDe(ruta: string) {
    return `file:///cache/${ruta}`;
  }
}

const bytes = (...n: number[]) => new Uint8Array(n);

describe('CacheDeFotosEnDisco', () => {
  it('lo que no se guardó no está', async () => {
    expect(await new CacheDeFotosEnDisco(new DiscoFalso()).obtener('u1_c1_5-1')).toBeNull();
  });

  it('guarda la foto como archivo y devuelve la misma ruta al pedirla', async () => {
    const cache = new CacheDeFotosEnDisco(new DiscoFalso());
    const uri = await cache.guardar('u1_c1_5-1', bytes(1, 2, 3));
    expect(uri).toBe('file:///cache/mediq-fotos/u1_c1_5-1.jpg');
    expect(await cache.obtener('u1_c1_5-1')).toBe(uri);
  });

  it('quitarDe borra todas las versiones de esa consulta y deja las demás', async () => {
    const disco = new DiscoFalso();
    const cache = new CacheDeFotosEnDisco(disco);
    await cache.guardar('u1_c1_5-1', bytes(1));
    await cache.guardar('u1_c1_6-2', bytes(2));
    await cache.guardar('u1_c11_5-1', bytes(3)); // otra consulta cuyo id empieza igual
    await cache.guardar('u2_c1_5-1', bytes(4)); // la misma consulta en otra cuenta
    await cache.quitarDe('u1_c1_');
    expect(await cache.obtener('u1_c1_5-1')).toBeNull();
    expect(await cache.obtener('u1_c1_6-2')).toBeNull();
    expect(await cache.obtener('u1_c11_5-1')).not.toBeNull();
    expect(await cache.obtener('u2_c1_5-1')).not.toBeNull();
  });

  it('limpiar lo borra todo (cerrar sesión o eliminar la cuenta)', async () => {
    const cache = new CacheDeFotosEnDisco(new DiscoFalso());
    await cache.guardar('u1_c1_5-1', bytes(1));
    await cache.guardar('u2_c2_5-1', bytes(2));
    await cache.limpiar();
    expect(await cache.obtener('u1_c1_5-1')).toBeNull();
    expect(await cache.obtener('u2_c2_5-1')).toBeNull();
  });

  it('limpiar sin nada guardado no falla', async () => {
    await expect(new CacheDeFotosEnDisco(new DiscoFalso()).limpiar()).resolves.toBeUndefined();
  });
});

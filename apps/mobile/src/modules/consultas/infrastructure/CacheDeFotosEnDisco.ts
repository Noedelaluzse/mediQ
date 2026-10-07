import type { CacheDeFotos } from '../domain/CacheDeFotos';

/** Lo mínimo que se usa del sistema de archivos del teléfono; permite probar la caché con un disco falso (como `BaseSqlite`). */
export interface Archivos {
  existe(ruta: string): boolean;
  escribir(ruta: string, bytes: Uint8Array): void;
  borrar(ruta: string): void;
  /** Nombres (no rutas) de lo que hay en la carpeta; vacío si no existe. */
  listar(carpeta: string): string[];
  asegurarCarpeta(carpeta: string): void;
  uriDe(ruta: string): string;
}

const CARPETA = 'mediq-fotos';

/** La caché de fotos como archivos JPEG en la carpeta de caché del teléfono (F051). La imagen no pasa por JavaScript como texto. */
export class CacheDeFotosEnDisco implements CacheDeFotos {
  constructor(private readonly archivos: Archivos) {}

  private ruta(clave: string) {
    return `${CARPETA}/${clave}.jpg`;
  }

  async obtener(clave: string): Promise<string | null> {
    const ruta = this.ruta(clave);
    return this.archivos.existe(ruta) ? this.archivos.uriDe(ruta) : null;
  }

  async guardar(clave: string, bytes: Uint8Array): Promise<string> {
    this.archivos.asegurarCarpeta(CARPETA);
    const ruta = this.ruta(clave);
    this.archivos.escribir(ruta, bytes);
    return this.archivos.uriDe(ruta);
  }

  async quitarDe(prefijo: string): Promise<void> {
    for (const nombre of this.archivos.listar(CARPETA)) {
      if (nombre.startsWith(prefijo)) this.archivos.borrar(`${CARPETA}/${nombre}`);
    }
  }

  async ultimaDe(prefijo: string): Promise<{ clave: string; uri: string } | null> {
    const nombre = this.archivos.listar(CARPETA).find((n) => n.startsWith(prefijo) && n.endsWith('.jpg'));
    if (nombre === undefined) return null;
    return { clave: nombre.slice(0, -'.jpg'.length), uri: this.archivos.uriDe(`${CARPETA}/${nombre}`) };
  }

  async limpiar(): Promise<void> {
    for (const nombre of this.archivos.listar(CARPETA)) this.archivos.borrar(`${CARPETA}/${nombre}`);
  }
}

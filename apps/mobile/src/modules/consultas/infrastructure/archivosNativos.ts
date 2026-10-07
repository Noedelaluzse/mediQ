import { Directory, File, Paths } from 'expo-file-system';

import type { Archivos } from './CacheDeFotosEnDisco';

/** Los archivos del teléfono con `expo-file-system`, dentro de la carpeta de caché (el sistema puede vaciarla y no se respalda). Solo en el teléfono. */
export const archivosNativos: Archivos = {
  existe: (ruta) => new File(Paths.cache, ruta).exists,
  escribir(ruta, bytes) {
    const archivo = new File(Paths.cache, ruta);
    if (!archivo.exists) archivo.create();
    archivo.write(bytes);
  },
  borrar(ruta) {
    const archivo = new File(Paths.cache, ruta);
    if (archivo.exists) archivo.delete();
  },
  listar(carpeta) {
    const dir = new Directory(Paths.cache, carpeta);
    return dir.exists ? dir.list().map((e) => e.name) : [];
  },
  asegurarCarpeta(carpeta) {
    const dir = new Directory(Paths.cache, carpeta);
    if (!dir.exists) dir.create({ intermediates: true });
  },
  uriDe: (ruta) => new File(Paths.cache, ruta).uri,
};

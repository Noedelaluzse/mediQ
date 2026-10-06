import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

import { bytesDeBase64 } from '@/shared/kernel/base64';

import type { OrigenDeFoto, ResultadoDeSeleccion, SelectorDeFoto } from '../domain/SelectorDeFoto';

const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.7;

/**
 * Cámara o galería con expo-image-picker; la foto se reduce a 1 600 px por el lado largo y se comprime a JPEG
 * (una receta legible pesa cientos de KB, no los varios MB de la foto original).
 * La galería usa el selector del sistema, que no pide permiso; la cámara sí.
 */
export class SelectorDeFotoExpo implements SelectorDeFoto {
  async elegir(origen: OrigenDeFoto): Promise<ResultadoDeSeleccion> {
    if (origen === 'camara') {
      const permiso = await requestCameraPermissionsAsync();
      if (!permiso.granted) return { estado: 'permiso-denegado', puedePreguntar: permiso.canAskAgain };
    }
    const opciones = { mediaTypes: ['images' as const], quality: 1 };
    const r = origen === 'camara' ? await launchCameraAsync(opciones) : await launchImageLibraryAsync(opciones);
    const original = r.canceled ? undefined : r.assets?.[0];
    if (!original) return { estado: 'cancelada' };

    const contexto = ImageManipulator.manipulate(original.uri);
    if (Math.max(original.width, original.height) > LADO_MAXIMO) {
      contexto.resize(original.width >= original.height ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
    }
    const imagen = await contexto.renderAsync();
    const guardada = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_JPEG, base64: true });
    const base64 = guardada.base64 ?? '';
    return { estado: 'elegida', foto: { base64, tipoMime: 'image/jpeg', bytes: bytesDeBase64(base64), ancho: guardada.width, alto: guardada.height } };
  }
}

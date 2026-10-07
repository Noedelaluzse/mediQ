import type { Conectividad } from './Conectividad';
import type { CopiaLocal } from './CopiaLocal';
import { conTiempoLimite, ErrorDeRed, esErrorDeRed } from './red';

/** Cuánto se espera al servidor antes de mostrar la copia (Firestore sin conexión tarda ~10 s en rendirse). */
export const LIMITE_DE_LECTURA_MS = 12_000;

/**
 * Lectura con copia local (RNF-11): con internet lee del servidor y deja la copia al día; sin internet (o si falla por red) devuelve
 * la copia. Un error que NO es de red (permisos, un bug) sube tal cual: no se esconde detrás de datos viejos. Guardar la copia
 * nunca hace fallar la lectura. Sin internet y sin copia falla con `ErrorDeRed` (la pantalla muestra su error de siempre).
 */
export async function leerConCopia<T>(o: {
  clave: string;
  copia: CopiaLocal;
  red: Conectividad;
  leer: () => Promise<T>;
  aTexto: (valor: T) => string;
  deTexto: (texto: string) => T | null;
}): Promise<T> {
  const desdeLaCopia = async (): Promise<T | null> => {
    try {
      const texto = await o.copia.leer(o.clave);
      return texto === null ? null : o.deTexto(texto);
    } catch {
      return null;
    }
  };

  if (!(await o.red.estaConectado())) {
    const copia = await desdeLaCopia();
    if (copia !== null) return copia;
    throw new ErrorDeRed();
  }

  try {
    const valor = await conTiempoLimite(o.leer(), LIMITE_DE_LECTURA_MS);
    await o.copia.guardar(o.clave, o.aTexto(valor)).catch(() => undefined);
    return valor;
  } catch (error) {
    if (!esErrorDeRed(error)) throw error;
    const copia = await desdeLaCopia();
    if (copia !== null) return copia;
    throw error;
  }
}

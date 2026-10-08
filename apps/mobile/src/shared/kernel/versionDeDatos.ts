let version = 0;

/** Sube cada vez que algo de la cuenta se guarda, edita o borra desde la app: lo ya cargado en pantallas puede estar viejo (P-06). */
export const versionDeDatos = (): number => version;

export const marcarDatosCambiados = (): void => {
  version += 1;
};

type CasoDeUso = { ejecutar: (...args: never[]) => unknown };

const esPromesa = (valor: unknown): valor is Promise<unknown> => typeof (valor as { then?: unknown } | null)?.then === 'function';

const marcandoCambios = <T extends CasoDeUso>(caso: T): T => {
  // Hereda del original: conserva su tipo, sus métodos y su `this`; solo `ejecutar` avisa al terminar.
  const envuelto = Object.create(caso) as T;
  (envuelto as { ejecutar: unknown }).ejecutar = (...args: never[]) => {
    let resultado: unknown;
    try {
      resultado = caso.ejecutar(...args);
    } catch (error) {
      marcarDatosCambiados();
      throw error;
    }
    if (esPromesa(resultado)) return resultado.finally(marcarDatosCambiados);
    marcarDatosCambiados();
    return resultado;
  };
  return envuelto;
};

/**
 * Envuelve los casos de uso que escriben (`nombres`) para que, al terminar —bien o mal: pudo cambiar algo a medias—, suban la
 * versión de los datos. Es un solo punto: las pantallas no tienen que acordarse de avisar.
 */
export function conInvalidaciones<T extends Record<string, unknown>>(casos: T, nombres: readonly string[]): T {
  const resultado: Record<string, unknown> = { ...casos };
  for (const nombre of nombres) {
    const caso = casos[nombre] as CasoDeUso | undefined;
    if (caso && typeof caso.ejecutar === 'function') resultado[nombre] = marcandoCambios(caso);
  }
  return resultado as T;
}

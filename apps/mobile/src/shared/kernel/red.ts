/** Falló por falta de internet (o por esperar demasiado), no por los datos: reintentar más tarde puede funcionar. */
export class ErrorDeRed extends Error {
  constructor(causa?: unknown) {
    super('No hay conexión con el servidor', { cause: causa });
    this.name = 'ErrorDeRed';
  }
}

const CODIGOS_DE_RED = ['unavailable', 'deadline-exceeded'];
const MENSAJES_DE_RED = /offline|network request failed|network error|failed to fetch|timeout|timed out/i;

/**
 * ¿Es un fallo de conexión? Los de Firestore («unavailable», «deadline-exceeded»), los mensajes típicos de red y `ErrorDeRed`.
 * Un rechazo de las reglas («permission-denied») o un dato inválido NO lo son: reintentar no los arregla. Busca también en `cause`.
 */
export function esErrorDeRed(error: unknown): boolean {
  if (error instanceof ErrorDeRed) return true;
  if (typeof error !== 'object' || error === null) return false;
  const { code, message, cause } = error as { code?: unknown; message?: unknown; cause?: unknown };
  if (typeof code === 'string' && CODIGOS_DE_RED.includes(code)) return true;
  if (typeof message === 'string' && MENSAJES_DE_RED.test(message)) return true;
  return cause !== undefined && cause !== error && esErrorDeRed(cause);
}

/**
 * Firestore sin conexión no rechaza una escritura: se queda esperando. Esto la convierte en un `ErrorDeRed` al pasar `ms`.
 * La escritura original puede completarse después, por eso los envíos usan ids estables (reescribir no duplica).
 */
export function conTiempoLimite<T>(operacion: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new ErrorDeRed()), ms);
  });
  return Promise.race([operacion, limite]).finally(() => clearTimeout(temporizador));
}

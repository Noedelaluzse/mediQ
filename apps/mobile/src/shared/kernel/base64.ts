const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bytes → base64. Hermes no trae `Buffer`, y `btoa` con cadenas enormes es lento: se codifica a mano. */
export function bytesABase64(bytes: Uint8Array): string {
  const salida: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const trio = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    salida.push(
      ALFABETO[(trio >> 18) & 63],
      ALFABETO[(trio >> 12) & 63],
      b === undefined ? '=' : ALFABETO[(trio >> 6) & 63],
      c === undefined ? '=' : ALFABETO[trio & 63],
    );
  }
  return salida.join('');
}

const INDICE = new Map([...ALFABETO].map((c, n) => [c, n]));

export function base64ABytes(base64: string): Uint8Array {
  const limpio = base64.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let escritos = 0;
  for (let i = 0; i < limpio.length; i += 4) {
    const trio =
      ((INDICE.get(limpio[i]) ?? 0) << 18) |
      ((INDICE.get(limpio[i + 1]) ?? 0) << 12) |
      ((INDICE.get(limpio[i + 2]) ?? 0) << 6) |
      (INDICE.get(limpio[i + 3]) ?? 0);
    if (escritos < bytes.length) bytes[escritos++] = (trio >> 16) & 255;
    if (escritos < bytes.length) bytes[escritos++] = (trio >> 8) & 255;
    if (escritos < bytes.length) bytes[escritos++] = trio & 255;
  }
  return bytes;
}

/** Tamaño en bytes que tiene un contenido en base64, sin decodificarlo. */
export function bytesDeBase64(base64: string): number {
  const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - relleno;
}

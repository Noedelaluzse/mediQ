import { describe, expect, it } from 'vitest';

import { base64ABytes, bytesABase64, bytesDeBase64 } from './base64';

const bytes = (texto: string) => new TextEncoder().encode(texto);

describe('bytesABase64 / base64ABytes', () => {
  it.each([['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foobar', 'Zm9vYmFy']])('codifica «%s»', (texto, esperado) => {
    expect(bytesABase64(bytes(texto))).toBe(esperado);
  });

  it('ida y vuelta con todos los valores de byte', () => {
    const todos = Uint8Array.from({ length: 256 }, (_, n) => n);
    expect(base64ABytes(bytesABase64(todos))).toEqual(todos);
  });

  it('maneja un archivo grande sin desbordar', () => {
    const grande = new Uint8Array(1_500_000).map((_, n) => n % 251);
    const vuelta = base64ABytes(bytesABase64(grande));
    expect(vuelta.length).toBe(grande.length);
    expect(vuelta.every((v, n) => v === grande[n])).toBe(true);
  });
});

describe('bytesDeBase64', () => {
  it('coincide con el tamaño real, con y sin relleno', () => {
    for (const t of ['', 'f', 'fo', 'foo', 'foobar', 'foobars']) expect(bytesDeBase64(bytesABase64(bytes(t)))).toBe(t.length);
  });
});

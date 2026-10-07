/// <reference types="node" />
// Cada paquete con módulo nativo se registra en CADA arranque, en el hilo de JavaScript, aunque la app nunca lo use (auditoría de
// performance, docs/17, F049: `@expo/ui` costaba ≈ 850 ms de un registro de módulos de ≈ 2 000 ms). `expo-router` lo trae como
// dependencia propia (solo lo importa en archivos de Android), así que no basta con no declararlo: hay que excluirlo del autolinking de iOS.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = resolve(__dirname, '..');
const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  expo?: { autolinking?: { ios?: { exclude?: string[] } } };
};

/** Paquetes con módulo nativo que costaron arranque en iOS sin que el código los use. Si de verdad se necesitan, se quitan de aquí y se mide. */
const EXCLUIDOS_DE_IOS = ['@expo/ui'];

function archivosDeCodigo(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
    return /\.(ts|tsx|js)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });
}

describe('arranque: módulos nativos sin uso en iOS', () => {
  it.each(EXCLUIDOS_DE_IOS)('%s está excluido del autolinking de iOS', (nombre) => {
    expect(paquete.expo?.autolinking?.ios?.exclude).toContain(nombre);
  });

  it.each(EXCLUIDOS_DE_IOS)('%s no lo importa ningún archivo de la app (si lo importara, en iOS fallaría al abrir)', (nombre) => {
    const usa = [join(raiz, 'src'), join(raiz, 'plugins'), join(raiz, 'config')]
      .flatMap(archivosDeCodigo)
      .some((f) => readFileSync(f, 'utf8').includes(`'${nombre}`));
    expect(usa).toBe(false);
  });

  it.each(EXCLUIDOS_DE_IOS)('%s ya no es dependencia directa de la app', (nombre) => {
    expect(paquete.dependencies).not.toHaveProperty(nombre);
  });
});

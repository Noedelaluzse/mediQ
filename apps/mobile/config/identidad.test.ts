/// <reference types="node" />
// Identidad visual (iconos y pantalla de carga): comprueba que app.json apunta a archivos reales, con el tamaño y el
// formato que exigen las tiendas. Los originales están en docs/mediq-identidad.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = resolve(__dirname, '..');
const expo = JSON.parse(readFileSync(resolve(raiz, 'app.json'), 'utf8')).expo;
const VERDE = '#0B6654';

/** Lee ancho, alto y tipo de color de la cabecera de un PNG (tipo 2 = RGB sin transparencia, 6 = RGBA). */
function cabeceraPng(ruta: string) {
  const d = readFileSync(resolve(raiz, ruta));
  expect(d.subarray(1, 4).toString()).toBe('PNG');
  return { ancho: d.readUInt32BE(16), alto: d.readUInt32BE(20), tipoDeColor: d[25] };
}

describe('identidad visual de MediQ', () => {
  it('el icono de la app es un PNG cuadrado de 1024 px sin transparencia (lo exige la App Store)', () => {
    expect(expo.icon).toBe('./assets/images/icon.png');
    expect(cabeceraPng(expo.icon)).toEqual({ ancho: 1024, alto: 1024, tipoDeColor: 2 });
  });

  it('iOS usa ese mismo icono y no la plantilla de Expo', () => {
    expect(expo.ios.icon).toBeUndefined();
    expect(existsSync(resolve(raiz, 'assets/expo.icon'))).toBe(false);
  });

  it('Android: las tres capas adaptativas existen, son cuadradas y del mismo tamaño', () => {
    const { foregroundImage, backgroundImage, monochromeImage, backgroundColor } = expo.android.adaptiveIcon;
    const capas = [foregroundImage, backgroundImage, monochromeImage].map(cabeceraPng);
    for (const c of capas) expect(c.ancho).toBe(c.alto);
    expect(new Set(capas.map((c) => c.ancho)).size).toBe(1);
    expect(backgroundColor).toBe(VERDE);
  });

  it('la pantalla de carga usa el símbolo sobre el verde de la marca', () => {
    const plugin = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    const opciones = plugin[1];
    expect(opciones.backgroundColor).toBe(VERDE);
    expect(opciones.image).toBe('./assets/images/splash-icon.png');
    const { ancho, alto } = cabeceraPng(opciones.image);
    expect(ancho).toBeGreaterThan(alto); // el símbolo MQ es apaisado
    expect(ancho).toBeLessThanOrEqual(1200); // sin imágenes enormes en el arranque
  });

  it('el favicon web existe', () => {
    expect(cabeceraPng(expo.web.favicon).ancho).toBe(48);
  });

  it('el logo horizontal para dentro de la app existe, conserva la proporción del original y no es enorme', () => {
    const { ancho, alto } = cabeceraPng('assets/images/logo-horizontal.png');
    expect(ancho / alto).toBeCloseTo(2400 / 553, 1);
    expect(ancho).toBeLessThanOrEqual(900);
  });

  it('los originales de la identidad se conservan en docs/mediq-identidad', () => {
    for (const f of ['ios/AppIcon-1024.png', 'svg/mediq-simbolo-verde.svg', 'android/android-foreground.png', 'LEEME.txt']) {
      expect(existsSync(resolve(raiz, '../../docs/mediq-identidad', f))).toBe(true);
    }
  });
});

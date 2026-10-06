import { describe, expect, it } from 'vitest';

import { MARCA, parcharPodfile } from './sqliteHeader';

const podfile = `platform :ios, '16.4'

target 'mediQ' do
  use_expo_modules!
  post_install do |installer|
    react_native_post_install(installer)
  end
end
`;

describe('parcharPodfile (expo-sqlite con el SDK de Xcode 27)', () => {
  it('agrega al post_install el arreglo del encabezado de ExpoSQLite', () => {
    const r = parcharPodfile(podfile);
    expect(r).toContain(MARCA);
    expect(r).toContain('ExpoSQLite-umbrella.h');
    expect(r).toContain('#import <ExpoSQLite/sqlite3.h>');
  });

  it('lo agrega dentro del post_install, antes de lo que ya había', () => {
    const r = parcharPodfile(podfile);
    expect(r.indexOf('post_install do |installer|')).toBeLessThan(r.indexOf(MARCA));
    expect(r.indexOf(MARCA)).toBeLessThan(r.indexOf('react_native_post_install(installer)'));
  });

  it('es idempotente: aplicarlo dos veces no lo duplica', () => {
    const una = parcharPodfile(podfile);
    expect(parcharPodfile(una)).toBe(una);
    expect(una.split(MARCA).length - 1).toBe(1);
  });

  it('falla con un mensaje claro si el Podfile no tiene post_install', () => {
    expect(() => parcharPodfile("platform :ios, '16.4'\n")).toThrow(/post_install/);
  });

  it('el bloque Ruby sustituye el import y no reescribe el archivo si no cambia nada', () => {
    const r = parcharPodfile(podfile);
    expect(r).toContain("gsub('#import \"sqlite3.h\"', '#import <ExpoSQLite/sqlite3.h>')");
    expect(r).toContain('unless parchado == texto');
  });
});

/**
 * expo-sqlite con el SDK de iOS de Xcode 27: al compilar para un iPhone, Swift no encuentra las funciones `exsqlite3_*`
 * (63 errores en SQLiteModule.swift) porque `#import "sqlite3.h"` del encabezado paraguas de ExpoSQLite resuelve al
 * sqlite3.h del sistema en vez del que trae el paquete (las constantes sí aparecen, las funciones no). En el simulador
 * no pasa. Con la ruta explícita `<ExpoSQLite/sqlite3.h>` compila. Ver docs/solucion-de-problemas.md §3.24.
 */
const MARCA = '# [MediQ] expo-sqlite + Xcode 27';

const BLOQUE = `    ${MARCA}: usar el sqlite3.h del propio paquete (docs/solucion-de-problemas.md §3.24)
    umbrella = File.join(installer.sandbox.root.to_s, 'Target Support Files', 'ExpoSQLite', 'ExpoSQLite-umbrella.h')
    if File.exist?(umbrella)
      texto = File.read(umbrella)
      parchado = texto.gsub('#import "sqlite3.h"', '#import <ExpoSQLite/sqlite3.h>')
      File.write(umbrella, parchado) unless parchado == texto
    end
`;

/** Agrega el arreglo al `post_install` del Podfile; si ya está, lo deja igual. */
function parcharPodfile(podfile) {
  if (podfile.includes(MARCA)) return podfile;
  const inicio = /^(\s*post_install do \|installer\|\s*\n)/m;
  if (!inicio.test(podfile)) throw new Error('El Podfile no tiene un bloque post_install: no se puede aplicar el arreglo de expo-sqlite');
  return podfile.replace(inicio, `$1${BLOQUE}`);
}

module.exports = { MARCA, parcharPodfile };

const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const { parcharPodfile } = require('./sqliteHeader');

/** Config plugin: arregla la compilación de expo-sqlite para iPhone con Xcode 27 (ver ./sqliteHeader.js). */
module.exports = function withSqliteHeader(config) {
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const archivo = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      fs.writeFileSync(archivo, parcharPodfile(fs.readFileSync(archivo, 'utf8')));
      return c;
    },
  ]);
};

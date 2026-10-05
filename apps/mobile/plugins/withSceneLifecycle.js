const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');

const { agregarManifiestoDeEscena, parcharAppDelegate } = require('./sceneLifecycle');

/** Config plugin: adopta UIScene en el proyecto iOS generado (necesario para iOS 27). */
module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults = agregarManifiestoDeEscena(c.modResults);
    return c;
  });

  return withDangerousMod(config, [
    'ios',
    (c) => {
      const archivo = path.join(c.modRequest.platformProjectRoot, c.modRequest.projectName, 'AppDelegate.swift');
      fs.writeFileSync(archivo, parcharAppDelegate(fs.readFileSync(archivo, 'utf8')));
      return c;
    },
  ]);
};

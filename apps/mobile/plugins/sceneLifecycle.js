// Transformaciones puras para adoptar el ciclo de vida por escenas (UIScene), que iOS 27 exige.
// JavaScript plano (CommonJS) porque Expo evalúa app.config.ts y sus plugins sin transformar imports.

const CONFORMANCIA = 'ExpoReactNativeFactoryProvider';

/** AppDelegate provee la fábrica de React Native; la ventana la crea ExpoAppSceneDelegate. */
function parcharAppDelegate(fuente) {
  if (fuente.includes(CONFORMANCIA)) return fuente;

  const clase = /class AppDelegate: ExpoAppDelegate \{/;
  if (!clase.test(fuente)) {
    throw new Error('sceneLifecycle: no se encontró "class AppDelegate: ExpoAppDelegate" en AppDelegate.swift; la plantilla cambió.');
  }

  const arranque = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
  if (!arranque.test(fuente)) {
    throw new Error('sceneLifecycle: no se encontró el bloque que crea la ventana en AppDelegate.swift; la plantilla cambió.');
  }

  return fuente
    .replace(clase, `class AppDelegate: ExpoAppDelegate, ${CONFORMANCIA} {`)
    .replace(arranque, '\n');
}

/** Declara EXExpoAppSceneDelegate como delegado de la escena principal. No modifica el original. */
function agregarManifiestoDeEscena(infoPlist) {
  return {
    ...infoPlist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    },
  };
}

module.exports = { parcharAppDelegate, agregarManifiestoDeEscena };

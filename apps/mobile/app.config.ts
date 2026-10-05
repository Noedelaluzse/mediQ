import type { ConfigContext, ExpoConfig } from 'expo/config';

import { urlSchemeDeGoogle } from './config/google';
import { obtenerVersion } from './config/version';

// app.json es la base; aquí solo se añade lo que depende del entorno (IDs de cliente de Google).
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];

  if (iosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: urlSchemeDeGoogle(iosClientId) }]);
  }

  // iOS 27 exige el ciclo de vida por escenas (UIScene); Expo SDK 57 trae la pieza, pero la plantilla no la activa.
  plugins.push('./plugins/withSceneLifecycle');

  // Versión automática desde git (1.<features>.<resto>); ver config/version.js.
  const { version, commit, compilacion } = obtenerVersion();
  // Constants.expoConfig en la app de desarrollo trae la configuración con que se compiló lo nativo (1.0.0), no la actual:
  // por eso Perfil lee la versión de estas variables, que Metro incrusta al empaquetar el JavaScript.
  process.env.EXPO_PUBLIC_APP_VERSION = version;
  process.env.EXPO_PUBLIC_APP_COMMIT = commit ?? '';

  return {
    ...config,
    name: config.name ?? 'mediQ',
    slug: config.slug ?? 'mediQ',
    version,
    ios: { ...config.ios, buildNumber: String(compilacion) },
    android: { ...config.android, versionCode: compilacion },
    extra: { ...config.extra, commit },
    plugins,
  };
};

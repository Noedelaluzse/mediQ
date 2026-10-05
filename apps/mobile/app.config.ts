import type { ConfigContext, ExpoConfig } from 'expo/config';

import { urlSchemeDeGoogle } from './config/google';

// app.json es la base; aquí solo se añade lo que depende del entorno (IDs de cliente de Google).
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];

  if (iosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: urlSchemeDeGoogle(iosClientId) }]);
  }

  // iOS 27 exige el ciclo de vida por escenas (UIScene); Expo SDK 57 trae la pieza, pero la plantilla no la activa.
  plugins.push('./plugins/withSceneLifecycle');

  return { ...config, name: config.name ?? 'mediQ', slug: config.slug ?? 'mediQ', plugins };
};

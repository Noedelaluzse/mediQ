import type { ClienteGoogle } from './GoogleProveedorDeIdentidad';

type Config = { iosClientId: string; webClientId?: string };

/**
 * Envuelve el SDK nativo de Google. Devuelve null si el módulo nativo no existe
 * (por ejemplo en Expo Go), para que la app use el adaptador simulado.
 */
export function crearClienteGoogleNativo(config: Config): ClienteGoogle | null {
  try {
    // require diferido: importar el módulo falla donde no está el código nativo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    const { GoogleSignin, isErrorWithCode, statusCodes } = sdk;

    GoogleSignin.configure({ iosClientId: config.iosClientId, webClientId: config.webClientId || undefined });

    return {
      async signOut() {
        await GoogleSignin.signOut();
      },

      async signInSilently() {
        try {
          const r = await GoogleSignin.signInSilently();
          if (r.type === 'success') return { type: 'success', data: { idToken: r.data.idToken } };
          return { type: 'noSavedCredentialFound' };
        } catch (e) {
          if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_REQUIRED) return { type: 'noSavedCredentialFound' };
          throw e;
        }
      },

      async signIn() {
        try {
          const r = await GoogleSignin.signIn();
          if (r.type === 'success') return { type: 'success', data: { idToken: r.data.idToken } };
          return { type: 'cancelled' };
        } catch (e) {
          if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return { type: 'cancelled' };
          throw e;
        }
      },
    };
  } catch {
    return null;
  }
}

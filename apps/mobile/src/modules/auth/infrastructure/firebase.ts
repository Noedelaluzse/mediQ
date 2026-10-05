import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseConfig = { apiKey: string; projectId: string; appId: string };

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

export function obtenerFirebase(config: FirebaseConfig) {
  app ??= getApps().length
    ? getApp()
    : initializeApp({ ...config, authDomain: `${config.projectId}.firebaseapp.com` });

  if (!auth) {
    try {
      // Sin persistencia nativa: la sesión de la app vive en SecureStore; Firebase solo se usa al iniciar sesión.
      auth = initializeAuth(app);
    } catch {
      auth = getAuth(app);
    }
  }

  // En React Native el canal por defecto de Firestore suele colgarse: se autodetecta long polling.
  firestore ??= initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

  return { auth, firestore };
}

/** Lee la configuración de las variables de entorno; null si falta algo (se usa el adaptador simulado). */
export function configuracionDeFirebase(): FirebaseConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  return apiKey && projectId && appId ? { apiKey, projectId, appId } : null;
}

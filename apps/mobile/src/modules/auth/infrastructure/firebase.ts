import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/** `storageBucket` es opcional: sin él no hay fotos (modo simulado para esa parte). */
export type FirebaseConfig = { apiKey: string; projectId: string; appId: string; storageBucket?: string };

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;

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

  if (config.storageBucket) storage ??= getStorage(app, `gs://${config.storageBucket}`);

  return { auth, firestore, storage };
}

/** Lee la configuración de las variables de entorno; null si falta algo (se usa el adaptador simulado). */
export function configuracionDeFirebase(): FirebaseConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
  return apiKey && projectId && appId ? { apiKey, projectId, appId, storageBucket } : null;
}

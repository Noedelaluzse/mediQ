import { AceptarAvisoDePrivacidad } from '@/modules/auth/application/AceptarAvisoDePrivacidad';
import { IniciarSesionConGoogle } from '@/modules/auth/application/IniciarSesionConGoogle';
import { ObtenerSesionActual } from '@/modules/auth/application/ObtenerSesionActual';
import { RegistrarCuenta } from '@/modules/auth/application/RegistrarCuenta';
import { configuracionDeFirebase, obtenerFirebase } from '@/modules/auth/infrastructure/firebase';
import { FirebaseAuthRepository } from '@/modules/auth/infrastructure/FirebaseAuthRepository';
import { FirebaseServicioIdentidad } from '@/modules/auth/infrastructure/FirebaseServicioIdentidad';
import { FirestoreCuentasRepository } from '@/modules/auth/infrastructure/FirestoreCuentasRepository';
import { GoogleProveedorDeIdentidad } from '@/modules/auth/infrastructure/GoogleProveedorDeIdentidad';
import { crearClienteGoogleNativo } from '@/modules/auth/infrastructure/NativeClienteGoogle';
import { SecureSesionStore } from '@/modules/auth/infrastructure/SecureSesionStore';
import { SimulatedAuthRepository } from '@/modules/auth/infrastructure/SimulatedAuthRepository';
import { SimulatedProveedorDeIdentidad } from '@/modules/auth/infrastructure/SimulatedProveedorDeIdentidad';

/** Google real si hay ID de cliente y módulo nativo (development build); si no, simulado (Expo Go). */
function crearIdentidad() {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const cliente = iosClientId
    ? crearClienteGoogleNativo({ iosClientId, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })
    : null;
  return cliente
    ? { identidad: new GoogleProveedorDeIdentidad(cliente), esReal: true }
    : { identidad: new SimulatedProveedorDeIdentidad(), esReal: false };
}

/** Prueba de F002: Firebase Auth + Firestore, solo con Google real y configuración de Firebase presente. */
function crearAuth(googleEsReal: boolean) {
  const config = googleEsReal ? configuracionDeFirebase() : null;
  if (!config) return new SimulatedAuthRepository();
  const { auth, firestore } = obtenerFirebase(config);
  return new FirebaseAuthRepository(
    new FirebaseServicioIdentidad(auth),
    new RegistrarCuenta(new FirestoreCuentasRepository(firestore)),
  );
}

/** Composition root: único lugar que conoce las clases concretas de infraestructura. */
export function crearContainer() {
  const sesiones = new SecureSesionStore();
  const { identidad, esReal } = crearIdentidad();
  // TODO: reemplazar por la API real (POST /auth/google, apps/api) cuando exista.
  const auth = crearAuth(esReal);

  return {
    iniciarSesionConGoogle: new IniciarSesionConGoogle(identidad, auth, sesiones),
    obtenerSesionActual: new ObtenerSesionActual(sesiones),
    aceptarAvisoDePrivacidad: new AceptarAvisoDePrivacidad(sesiones),
  };
}

export type Container = ReturnType<typeof crearContainer>;

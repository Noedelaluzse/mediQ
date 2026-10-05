import { AceptarAvisoDePrivacidad } from '@/modules/auth/application/AceptarAvisoDePrivacidad';
import { CerrarSesion } from '@/modules/auth/application/CerrarSesion';
import { ConsultarConsentimientosPendientes } from '@/modules/auth/application/ConsultarConsentimientosPendientes';
import { EliminarCuenta } from '@/modules/auth/application/EliminarCuenta';
import { IniciarSesionConGoogle } from '@/modules/auth/application/IniciarSesionConGoogle';
import { ObtenerSesionActual } from '@/modules/auth/application/ObtenerSesionActual';
import { RegistrarCuenta } from '@/modules/auth/application/RegistrarCuenta';
import { configuracionDeFirebase, obtenerFirebase } from '@/modules/auth/infrastructure/firebase';
import { FirebaseAuthRepository } from '@/modules/auth/infrastructure/FirebaseAuthRepository';
import { FirebaseServicioIdentidad } from '@/modules/auth/infrastructure/FirebaseServicioIdentidad';
import { FirestoreEliminadorDeDatos } from '@/modules/auth/infrastructure/FirestoreEliminadorDeDatos';
import { FirestoreCuentasRepository } from '@/modules/auth/infrastructure/FirestoreCuentasRepository';
import { FirestoreConsentimientosRepository } from '@/modules/auth/infrastructure/FirestoreConsentimientosRepository';
import { GoogleProveedorDeIdentidad } from '@/modules/auth/infrastructure/GoogleProveedorDeIdentidad';
import { InMemoryConsentimientosRepository } from '@/modules/auth/infrastructure/InMemoryConsentimientosRepository';
import { crearClienteGoogleNativo } from '@/modules/auth/infrastructure/NativeClienteGoogle';
import { SecureSesionStore } from '@/modules/auth/infrastructure/SecureSesionStore';
import { SimulatedAuthRepository } from '@/modules/auth/infrastructure/SimulatedAuthRepository';
import { SimulatedEliminadorDeDatos } from '@/modules/auth/infrastructure/SimulatedEliminadorDeDatos';
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

/** Firebase (Auth + Firestore) solo con Google real y configuración presente; si no, modo simulado. */
function crearFirebase(googleEsReal: boolean) {
  const config = googleEsReal ? configuracionDeFirebase() : null;
  return config ? obtenerFirebase(config) : null;
}

/** Composition root: único lugar que conoce las clases concretas de infraestructura. */
export function crearContainer() {
  const sesiones = new SecureSesionStore();
  const { identidad, esReal } = crearIdentidad();
  const firebase = crearFirebase(esReal);

  const auth = firebase
    ? new FirebaseAuthRepository(
        new FirebaseServicioIdentidad(firebase.auth),
        new RegistrarCuenta(new FirestoreCuentasRepository(firebase.firestore)),
      )
    : new SimulatedAuthRepository();
  const consentimientos = firebase
    ? new FirestoreConsentimientosRepository(firebase.firestore)
    : new InMemoryConsentimientosRepository();

  const datos = firebase ? new FirestoreEliminadorDeDatos(firebase.firestore) : new SimulatedEliminadorDeDatos();

  return {
    iniciarSesionConGoogle: new IniciarSesionConGoogle(identidad, auth, sesiones),
    obtenerSesionActual: new ObtenerSesionActual(sesiones, identidad, auth),
    aceptarAvisoDePrivacidad: new AceptarAvisoDePrivacidad(sesiones, consentimientos),
    consultarConsentimientosPendientes: new ConsultarConsentimientosPendientes(consentimientos),
    cerrarSesion: new CerrarSesion(sesiones, auth, identidad),
    eliminarCuenta: new EliminarCuenta(sesiones, datos, auth, identidad),
  };
}

export type Container = ReturnType<typeof crearContainer>;

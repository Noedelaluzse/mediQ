import { AceptarAvisoDePrivacidad } from '@/modules/auth/application/AceptarAvisoDePrivacidad';
import { IniciarSesionConGoogle } from '@/modules/auth/application/IniciarSesionConGoogle';
import { ObtenerSesionActual } from '@/modules/auth/application/ObtenerSesionActual';
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
  return cliente ? new GoogleProveedorDeIdentidad(cliente) : new SimulatedProveedorDeIdentidad();
}

/** Composition root: único lugar que conoce las clases concretas de infraestructura. */
export function crearContainer() {
  const sesiones = new SecureSesionStore();
  const identidad = crearIdentidad();
  // TODO: reemplazar por el adaptador real cuando exista POST /auth/google (apps/api).
  const auth = new SimulatedAuthRepository();

  return {
    iniciarSesionConGoogle: new IniciarSesionConGoogle(identidad, auth, sesiones),
    obtenerSesionActual: new ObtenerSesionActual(sesiones),
    aceptarAvisoDePrivacidad: new AceptarAvisoDePrivacidad(sesiones),
  };
}

export type Container = ReturnType<typeof crearContainer>;

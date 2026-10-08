import { err, ok, type Result } from '@/shared/kernel/Result';
import { esErrorDeRed } from '@/shared/kernel/red';

import type { RegistrarCuenta } from '../application/RegistrarCuenta';
import type { AuthRepository } from '../domain/AuthRepository';
import { CredencialRechazadaError, type ReautenticacionRequeridaError, ServidorNoDisponibleError, SinConexionError } from '../domain/errors';
import { crearSesion, type Sesion } from '../domain/Sesion';

export type IdentidadFirebase = {
  uid: string;
  googleSub: string;
  email: string;
  nombre: string;
  accessToken: string;
  refreshToken: string;
};

/** Lo mínimo que necesitamos de Firebase Auth: cambiar el idToken de Google por una identidad. */
export interface ServicioDeIdentidadFirebase {
  iniciarSesionConGoogle(idToken: string): Promise<Result<IdentidadFirebase, CredencialRechazadaError | SinConexionError>>;
  cerrarSesion(): Promise<void>;
  eliminarUsuario(): Promise<Result<void, ReautenticacionRequeridaError | ServidorNoDisponibleError>>;
}

/** Prueba de F002: Firebase Auth + Firestore hacen el papel de la API hasta que exista `apps/api`. */
export class FirebaseAuthRepository implements AuthRepository {
  constructor(
    private readonly identidad: ServicioDeIdentidadFirebase,
    private readonly registrar: RegistrarCuenta,
  ) {}

  async autenticarConGoogle(
    idToken: string,
  ): Promise<Result<Sesion, ServidorNoDisponibleError | CredencialRechazadaError>> {
    const firebase = await this.identidad.iniciarSesionConGoogle(idToken);
    if (!firebase.ok) return err(firebase.error);
    const { uid, googleSub, email, nombre, accessToken, refreshToken } = firebase.value;

    let primeraVez: boolean;
    try {
      ({ primeraVez } = await this.registrar.ejecutar({ usuarioId: uid, googleSub, email, nombre }));
    } catch (e) {
      // Sin internet no es lo mismo que un servidor que falla: la sesión guardada puede seguir siendo válida (F052).
      return err(esErrorDeRed(e) ? new SinConexionError(e) : new ServidorNoDisponibleError(e));
    }

    const sesion = crearSesion({ accessToken, refreshToken, usuario: { id: uid, nombre, email }, primeraVez });
    return sesion.ok ? ok(sesion.value) : err(new CredencialRechazadaError());
  }

  async cerrarSesion(): Promise<void> {
    await this.identidad.cerrarSesion();
  }

  eliminarUsuario(): Promise<Result<void, ReautenticacionRequeridaError | ServidorNoDisponibleError>> {
    return this.identidad.eliminarUsuario();
  }
}

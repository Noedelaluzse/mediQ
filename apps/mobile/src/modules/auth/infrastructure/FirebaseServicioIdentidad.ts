import { deleteUser, GoogleAuthProvider, signInWithCredential, signOut, type Auth } from 'firebase/auth';

import { err, ok, type Result } from '@/shared/kernel/Result';

import { CredencialRechazadaError, ReautenticacionRequeridaError, ServidorNoDisponibleError } from '../domain/errors';
import { esReautenticacionRequerida } from './erroresFirebase';
import type { IdentidadFirebase, ServicioDeIdentidadFirebase } from './FirebaseAuthRepository';

export class FirebaseServicioIdentidad implements ServicioDeIdentidadFirebase {
  constructor(private readonly auth: Auth) {}

  async iniciarSesionConGoogle(idToken: string): Promise<Result<IdentidadFirebase, CredencialRechazadaError>> {
    try {
      const { user } = await signInWithCredential(this.auth, GoogleAuthProvider.credential(idToken));
      return ok({
        uid: user.uid,
        googleSub: user.providerData.find((p) => p.providerId === 'google.com')?.uid ?? user.uid,
        email: user.email ?? '',
        nombre: user.displayName ?? '',
        accessToken: await user.getIdToken(),
        refreshToken: user.refreshToken,
      });
    } catch {
      return err(new CredencialRechazadaError());
    }
  }

  async cerrarSesion(): Promise<void> {
    await signOut(this.auth);
  }

  async eliminarUsuario(): Promise<Result<void, ReautenticacionRequeridaError | ServidorNoDisponibleError>> {
    const usuario = this.auth.currentUser;
    if (!usuario) return err(new ServidorNoDisponibleError());
    try {
      await deleteUser(usuario);
      return ok(undefined);
    } catch (e) {
      return err(esReautenticacionRequerida(e) ? new ReautenticacionRequeridaError() : new ServidorNoDisponibleError());
    }
  }
}

import type { Consentimiento } from '../domain/Consentimiento';
import type { ConsentimientosRepository } from '../domain/ConsentimientosRepository';

/** Consentimientos en memoria: solo para el modo simulado (Expo Go, sin Firebase). Se pierden al cerrar la app. */
export class InMemoryConsentimientosRepository implements ConsentimientosRepository {
  private readonly porUsuario = new Map<string, Consentimiento[]>();

  async listar(usuarioId: string): Promise<Consentimiento[]> {
    return this.porUsuario.get(usuarioId) ?? [];
  }

  async registrar(usuarioId: string, consentimiento: Consentimiento): Promise<void> {
    this.porUsuario.set(usuarioId, [...(this.porUsuario.get(usuarioId) ?? []), consentimiento]);
  }
}

import type { Consentimiento } from './Consentimiento';

export interface ConsentimientosRepository {
  listar(usuarioId: string): Promise<Consentimiento[]>;
  registrar(usuarioId: string, consentimiento: Consentimiento): Promise<void>;
}

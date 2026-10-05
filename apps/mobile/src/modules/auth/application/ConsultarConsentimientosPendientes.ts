import { documentosPendientes, type Documento } from '../domain/Consentimiento';
import type { ConsentimientosRepository } from '../domain/ConsentimientosRepository';

export class ConsultarConsentimientosPendientes {
  constructor(private readonly consentimientos: ConsentimientosRepository) {}

  async ejecutar(usuarioId: string): Promise<Documento[]> {
    return documentosPendientes(await this.consentimientos.listar(usuarioId));
  }
}

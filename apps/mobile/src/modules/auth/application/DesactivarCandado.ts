import type { PreferenciaDelCandadoStore } from '../domain/Candado';

/** F036: apaga el candado (botón del Perfil o «Ahora no» de la oferta) y recuerda que ya se ofreció, para no volver a preguntar. */
export class DesactivarCandado {
  constructor(private readonly preferencia: PreferenciaDelCandadoStore) {}

  async ejecutar(): Promise<void> {
    await this.preferencia.guardar({ activado: false, ofrecido: true });
  }
}

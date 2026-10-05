import type { BorradorDeConsulta } from '../domain/Borrador';
import type { BorradorRepository } from '../domain/BorradorRepository';

/** HU-04: al reabrir "Nueva consulta" se recupera lo que se había escrito. */
export class RecuperarBorrador {
  constructor(private readonly borradores: BorradorRepository) {}

  ejecutar(): Promise<BorradorDeConsulta | null> {
    return this.borradores.leer();
  }
}

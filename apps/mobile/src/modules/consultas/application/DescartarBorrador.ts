import type { BorradorRepository } from '../domain/BorradorRepository';

export class DescartarBorrador {
  constructor(private readonly borradores: BorradorRepository) {}

  ejecutar(): Promise<void> {
    return this.borradores.borrar();
  }
}

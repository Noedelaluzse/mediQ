import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';

export class QuitarFotoDeReceta {
  constructor(private readonly fotos: FotoDeRecetaRepository) {}

  ejecutar(consultaId: string): Promise<void> {
    return this.fotos.quitar(consultaId);
  }
}

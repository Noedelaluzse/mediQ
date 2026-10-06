import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';

export class ObtenerFotoDeReceta {
  constructor(private readonly fotos: FotoDeRecetaRepository) {}

  ejecutar(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null> {
    return this.fotos.obtener(consultaId);
  }
}

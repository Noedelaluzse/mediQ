import { ok, type Result } from '@/shared/kernel/Result';

import type { FotoInvalidaError } from '../domain/errors';
import { crearFotoDeReceta, type FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';
import type { OrigenDeFoto, SelectorDeFoto } from '../domain/SelectorDeFoto';

export type ResultadoDeAdjuntar =
  | { estado: 'adjuntada'; foto: FotoDeReceta }
  | { estado: 'cancelada' }
  | { estado: 'permiso-denegado'; puedePreguntar: boolean };

/** Toma o elige la foto de la receta y la guarda en la consulta, reemplazando la anterior (CU-04, RF-30). */
export class AdjuntarFotoDeReceta {
  constructor(
    private readonly selector: SelectorDeFoto,
    private readonly fotos: FotoDeRecetaRepository,
  ) {}

  async ejecutar(consultaId: string, origen: OrigenDeFoto): Promise<Result<ResultadoDeAdjuntar, FotoInvalidaError>> {
    const r = await this.selector.elegir(origen);
    if (r.estado === 'cancelada') return ok({ estado: 'cancelada' });
    if (r.estado === 'permiso-denegado') return ok({ estado: 'permiso-denegado', puedePreguntar: r.puedePreguntar });
    const foto = crearFotoDeReceta(r.foto);
    if (!foto.ok) return foto;
    await this.fotos.guardar(consultaId, foto.value, r.foto.base64);
    return ok({ estado: 'adjuntada', foto: foto.value });
  }
}

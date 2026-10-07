import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { Medicamento } from '../domain/Receta';
import { recetaATexto, recetaDeTexto } from './copiaDeDetalle';

/** La receta de una consulta con copia local (F032): se ve sin internet si esa consulta se abrió antes. Una receta vacía también se copia. */
export class ObtenerRecetaConCopiaLocal {
  constructor(
    private readonly real: { ejecutar(consultaId: string): Promise<Medicamento[]> },
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  ejecutar(consultaId: string): Promise<Medicamento[]> {
    return leerConCopia<Medicamento[]>({ clave: `receta-${consultaId}`, copia: this.copia, red: this.red, leer: () => this.real.ejecutar(consultaId), aTexto: recetaATexto, deTexto: recetaDeTexto });
  }
}

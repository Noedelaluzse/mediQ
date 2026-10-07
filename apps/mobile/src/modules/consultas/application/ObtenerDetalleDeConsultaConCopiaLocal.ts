import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import { detalleATexto, detalleDeTexto } from './copiaDeDetalle';
import type { DetalleDeConsulta } from './ObtenerDetalleDeConsulta';

/**
 * El detalle de una consulta con copia local (F032, RNF-11): cada vez que se abre con internet queda una copia de esa consulta, y sin
 * internet se muestra la copia de las que ya se abrieron antes. Una que nunca se abrió no tiene copia: falla como siempre.
 */
export class ObtenerDetalleDeConsultaConCopiaLocal {
  constructor(
    private readonly real: { ejecutar(consultaId: string): Promise<DetalleDeConsulta | null> },
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  async ejecutar(consultaId: string): Promise<DetalleDeConsulta | null> {
    const r = await leerConCopia<{ detalle: DetalleDeConsulta | null }>({
      clave: `detalle-${consultaId}`,
      copia: this.copia,
      red: this.red,
      leer: async () => ({ detalle: await this.real.ejecutar(consultaId) }),
      aTexto: (v) => detalleATexto(v.detalle),
      deTexto: detalleDeTexto,
    });
    return r.detalle;
  }
}

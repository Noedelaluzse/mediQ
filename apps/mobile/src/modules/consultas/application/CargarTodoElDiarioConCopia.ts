import { LecturaCompartida } from '@/shared/kernel/lecturaCompartida';
import { VIGENCIA_DE_BUSQUEDA_MS } from '@/shared/kernel/frescura';

import type { DiarioCompleto } from './CargarTodoElDiario';

/**
 * F071 (AUD-11): buscar en el Diario obliga a leer todo el historial. Antes se volvía a leer en cada búsqueda tras recargar la pantalla; ahora se
 * reusa la copia mientras no se guarde, edite o borre nada en la app, no se cierre sesión y no pasen 5 minutos (por si cambió desde otro aparato).
 * Un fallo no se guarda. Cada quien recibe su propia copia de la lista; el aviso de resultados parciales (`truncado`) se conserva.
 */
export class CargarTodoElDiarioConCopia {
  constructor(
    private readonly real: { ejecutar(): Promise<DiarioCompleto> },
    private readonly compartida = new LecturaCompartida<DiarioCompleto>(Date.now, VIGENCIA_DE_BUSQUEDA_MS),
  ) {}

  async ejecutar(): Promise<DiarioCompleto> {
    const r = await this.compartida.ejecutar('todo', () => this.real.ejecutar());
    return { consultas: [...r.consultas], truncado: r.truncado };
  }
}

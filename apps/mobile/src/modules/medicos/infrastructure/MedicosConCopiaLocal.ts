import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

const CLAVE = 'medicos';

function deTexto(texto: string): Medico[] | null {
  try {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? (valor as Medico[]).filter((m) => m && typeof m.id === 'string' && typeof m.nombreCompleto === 'string') : null;
  } catch {
    return null;
  }
}

/** La lista de médicos con copia local (RNF-11): sirve para elegir un médico guardado al capturar una consulta sin internet y, sin internet, para ver su detalle. Lo demás pasa directo. */
export class MedicosConCopiaLocal implements MedicosRepository {
  constructor(
    private readonly real: MedicosRepository,
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  listar(): Promise<Medico[]> {
    return leerConCopia<Medico[]>({ clave: CLAVE, copia: this.copia, red: this.red, leer: () => this.real.listar(), aTexto: (m) => JSON.stringify(m), deTexto });
  }

  /** Con internet va al servidor; sin él se busca en la lista copiada, que trae todos los datos del médico (F053: su detalle sin internet). */
  async obtener(id: string): Promise<Medico | null> {
    if (await this.red.estaConectado()) return this.real.obtener(id);
    return (await this.listar()).find((m) => m.id === id) ?? null;
  }
  guardar(medico: Medico) {
    return this.real.guardar(medico);
  }
  contarConsultas(id: string) {
    return this.real.contarConsultas(id);
  }
  eliminar(id: string) {
    return this.real.eliminar(id);
  }
}

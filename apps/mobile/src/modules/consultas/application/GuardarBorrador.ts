import { esBorradorVacio, type BorradorDeConsulta } from '../domain/Borrador';
import type { BorradorRepository } from '../domain/BorradorRepository';

/** RF-14: guarda lo que el paciente va escribiendo; si el formulario quedó vacío, borra el borrador. */
export class GuardarBorrador {
  constructor(private readonly borradores: BorradorRepository) {}

  async ejecutar(borrador: BorradorDeConsulta): Promise<'guardado' | 'descartado'> {
    if (esBorradorVacio(borrador)) {
      await this.borradores.borrar();
      return 'descartado';
    }
    await this.borradores.guardar(borrador);
    return 'guardado';
  }
}

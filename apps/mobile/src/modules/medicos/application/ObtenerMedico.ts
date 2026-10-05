import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

export class ObtenerMedico {
  constructor(private readonly medicos: MedicosRepository) {}

  ejecutar(id: string): Promise<Medico | null> {
    return this.medicos.obtener(id);
  }
}

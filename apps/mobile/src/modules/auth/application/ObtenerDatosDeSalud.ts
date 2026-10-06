import type { DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';

export class ObtenerDatosDeSalud {
  constructor(private readonly datos: DatosDeSaludRepository) {}

  ejecutar(): Promise<DatosDeSalud> {
    return this.datos.obtener();
  }
}

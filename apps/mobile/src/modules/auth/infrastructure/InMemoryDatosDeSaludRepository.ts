import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';

/** Modo simulado (sin Firebase): en memoria. */
export class InMemoryDatosDeSaludRepository implements DatosDeSaludRepository {
  private datos: DatosDeSalud = SIN_DATOS;
  async obtener() {
    return this.datos;
  }
  async guardar(datos: DatosDeSalud) {
    this.datos = datos;
  }
}

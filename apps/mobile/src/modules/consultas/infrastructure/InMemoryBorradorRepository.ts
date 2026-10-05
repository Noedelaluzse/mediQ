import type { BorradorDeConsulta } from '../domain/Borrador';
import type { BorradorRepository } from '../domain/BorradorRepository';

/** Para pruebas o si no hubiera SQLite: vive en memoria y se pierde al cerrar la app. */
export class InMemoryBorradorRepository implements BorradorRepository {
  private actual: BorradorDeConsulta | null = null;
  async leer() {
    return this.actual;
  }
  async guardar(b: BorradorDeConsulta) {
    this.actual = b;
  }
  async borrar() {
    this.actual = null;
  }
}

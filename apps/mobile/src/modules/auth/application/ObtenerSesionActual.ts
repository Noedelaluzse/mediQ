import type { Sesion } from '../domain/Sesion';
import type { SesionStore } from '../domain/SesionStore';

export class ObtenerSesionActual {
  constructor(private readonly sesiones: SesionStore) {}

  ejecutar(): Promise<Sesion | null> {
    return this.sesiones.leer();
  }
}

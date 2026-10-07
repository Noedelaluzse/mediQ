import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';

/** Quita una consulta de la cola sin enviarla (la que el servidor rechazó, o la que el usuario ya no quiere). */
export class DescartarConsultaPendiente {
  constructor(private readonly cola: ColaDeEnvioRepository) {}

  ejecutar(id: string): Promise<void> {
    return this.cola.quitar(id);
  }
}

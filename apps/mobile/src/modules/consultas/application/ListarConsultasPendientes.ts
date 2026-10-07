import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';
import type { ConsultaPendiente } from '../domain/ConsultaPendiente';

export class ListarConsultasPendientes {
  constructor(private readonly cola: ColaDeEnvioRepository) {}

  ejecutar(): Promise<ConsultaPendiente[]> {
    return this.cola.listar();
  }
}

import type { DomainError } from '@/shared/kernel/DomainError';
import { conTiempoLimite, esErrorDeRed } from '@/shared/kernel/red';
import { ok, type Result } from '@/shared/kernel/Result';

import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';
import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { Consulta } from '../domain/Consulta';
import type { EntradaRegistrarConsulta } from '../domain/EntradaDeConsulta';
import type { RegistrarConsulta } from './RegistrarConsulta';
import { validarEntradaDeConsulta } from './validarConsulta';

/** Cuánto se espera la respuesta del servidor antes de dar el envío por fallido y dejar la consulta en la cola. */
export const LIMITE_DE_ENVIO_MS = 15_000;

export type ResultadoDeGuardar = { estado: 'enviada'; consulta: Consulta } | { estado: 'en-cola'; id: string };

/**
 * Guardar una consulta nueva (RNF-11, F030): se valida sin red; con internet se envía de una vez, y sin internet (o si el envío falla
 * por red) se guarda en la cola del teléfono y se enviará sola al volver la conexión. El id se reserva aquí: reenviar no duplica.
 * Lo que no es de red (un rechazo de las reglas, un error de programa) no se esconde en la cola: sube como excepción.
 */
export class GuardarConsultaNueva {
  constructor(
    private readonly registrar: RegistrarConsulta,
    private readonly cola: ColaDeEnvioRepository,
    private readonly red: Conectividad,
    private readonly generarId: () => string,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(entrada: EntradaRegistrarConsulta): Promise<Result<ResultadoDeGuardar, DomainError>> {
    const valida = validarEntradaDeConsulta(entrada, this.ahora());
    if (!valida.ok) return valida;

    const id = this.generarId();
    if (await this.red.estaConectado()) {
      try {
        const r = await conTiempoLimite(this.registrar.ejecutar(entrada, id), LIMITE_DE_ENVIO_MS);
        return r.ok ? ok({ estado: 'enviada', consulta: r.value }) : r;
      } catch (error) {
        if (!esErrorDeRed(error)) throw error;
      }
    }

    await this.cola.agregar({ id, entrada, creadaEn: this.ahora(), intentos: 0 });
    return ok({ estado: 'en-cola', id });
  }
}

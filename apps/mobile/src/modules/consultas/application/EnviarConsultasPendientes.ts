import { DomainError } from '@/shared/kernel/DomainError';
import { conTiempoLimite, esErrorDeRed } from '@/shared/kernel/red';

import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';
import type { Conectividad } from '@/shared/kernel/Conectividad';
import { LIMITE_DE_ENVIO_MS } from './GuardarConsultaNueva';
import type { RegistrarConsulta } from './RegistrarConsulta';

export interface ResultadoDeEnviar {
  enviadas: number;
  /** Rechazadas por el servidor en esta ejecución (quedan en la cola con su motivo). */
  fallidas: number;
  /** Las que siguen esperando (sin contar las rechazadas). */
  pendientes: number;
}

const MOTIVO_GENERICO = 'El servidor no aceptó esta consulta.';

/**
 * Envía la cola en el orden en que se capturó (RNF-11, F030). Se llama al volver la conexión, al volver a la app y de vez en cuando.
 * Falla por red → se detiene (lo enviado queda enviado, el resto espera con un intento más). Rechazo del dominio o de las reglas →
 * esa consulta queda marcada con su motivo, ya no se reintenta sola, y se sigue con las demás. Una ejecución a la vez.
 */
export class EnviarConsultasPendientes {
  private enCurso: Promise<ResultadoDeEnviar> | null = null;

  constructor(
    private readonly cola: ColaDeEnvioRepository,
    private readonly registrar: RegistrarConsulta,
    private readonly red: Conectividad,
  ) {}

  ejecutar(): Promise<ResultadoDeEnviar> {
    this.enCurso ??= this.enviar().finally(() => {
      this.enCurso = null;
    });
    return this.enCurso;
  }

  private async enviar(): Promise<ResultadoDeEnviar> {
    let enviadas = 0;
    let fallidas = 0;
    if (await this.red.estaConectado()) {
      for (const c of (await this.cola.listar()).filter((x) => !x.error)) {
        try {
          const r = await conTiempoLimite(this.registrar.ejecutar(c.entrada, c.id), LIMITE_DE_ENVIO_MS);
          if (r.ok) {
            await this.cola.quitar(c.id);
            enviadas++;
          } else {
            await this.cola.actualizar({ ...c, error: r.error.message });
            fallidas++;
          }
        } catch (error) {
          if (esErrorDeRed(error)) {
            await this.cola.actualizar({ ...c, intentos: c.intentos + 1 });
            break;
          }
          await this.cola.actualizar({ ...c, error: error instanceof DomainError ? error.message : MOTIVO_GENERICO });
          fallidas++;
        }
      }
    }
    const pendientes = (await this.cola.listar()).filter((x) => !x.error).length;
    return { enviadas, fallidas, pendientes };
  }
}

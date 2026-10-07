import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';

/**
 * Desmarcar una dosis marcada por error (F029). Solo borra el registro: el aviso de esa toma, si aún no llega su hora, se vuelve a
 * programar en la siguiente sincronización de avisos (que quien llama debe lanzar después).
 */
export class DeshacerToma {
  constructor(private readonly registro: RegistroDeTomasRepository) {}

  ejecutar(tomaId: string): Promise<void> {
    return this.registro.deshacer(tomaId);
  }
}

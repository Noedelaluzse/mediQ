import { err, ok, type Result } from '@/shared/kernel/Result';

import { LugarNoEncontradoError } from '../domain/errors';
import type { LugaresRepository } from '../domain/LugaresRepository';

export class EliminarLugar {
  constructor(private readonly lugares: LugaresRepository) {}

  async ejecutar(id: string): Promise<Result<void, LugarNoEncontradoError>> {
    if (!(await this.lugares.obtener(id))) return err(new LugarNoEncontradoError());
    await this.lugares.eliminar(id);
    return ok(undefined);
  }
}

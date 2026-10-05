import { err, ok, type Result } from '@/shared/kernel/Result';

import { LugarDuplicadoError, LugarNoEncontradoError, type NombreDeLugarInvalidoError } from '../domain/errors';
import { claveDeLugar, crearLugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

export class RenombrarLugar {
  constructor(private readonly lugares: LugaresRepository) {}

  async ejecutar(
    id: string,
    nombre: string,
  ): Promise<Result<void, NombreDeLugarInvalidoError | LugarDuplicadoError | LugarNoEncontradoError>> {
    if (!(await this.lugares.obtener(id))) return err(new LugarNoEncontradoError());
    const r = crearLugar({ id, nombre });
    if (!r.ok) return r;
    const otro = await this.lugares.buscarPorClave(claveDeLugar(r.value.nombre));
    if (otro && otro.id !== id) return err(new LugarDuplicadoError());
    await this.lugares.renombrar(id, r.value.nombre);
    return ok(undefined);
  }
}

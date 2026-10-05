import { err, ok, type Result } from '@/shared/kernel/Result';

import { LugarDuplicadoError, type NombreDeLugarInvalidoError } from '../domain/errors';
import { claveDeLugar, crearLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

export class AgregarLugar {
  constructor(
    private readonly lugares: LugaresRepository,
    private readonly generarId: () => string,
  ) {}

  async ejecutar(nombre: string): Promise<Result<Lugar, NombreDeLugarInvalidoError | LugarDuplicadoError>> {
    const r = crearLugar({ id: this.generarId(), nombre });
    if (!r.ok) return r;
    if (await this.lugares.buscarPorClave(claveDeLugar(r.value.nombre))) return err(new LugarDuplicadoError());
    await this.lugares.crear(r.value);
    return ok(r.value);
  }
}

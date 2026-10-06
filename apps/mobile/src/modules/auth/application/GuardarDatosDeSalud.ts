import type { Result } from '@/shared/kernel/Result';

import { crearDatosDeSalud, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';
import type { DatosDeSaludInvalidosError } from '../domain/errors';

/** Valida todo primero y solo entonces guarda (RF-02); lo que se guarda es lo normalizado. */
export class GuardarDatosDeSalud {
  constructor(
    private readonly datos: DatosDeSaludRepository,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(entrada: DatosDeSalud): Promise<Result<DatosDeSalud, DatosDeSaludInvalidosError>> {
    const r = crearDatosDeSalud(entrada, this.ahora());
    if (!r.ok) return r;
    await this.datos.guardar(r.value);
    return r;
  }
}

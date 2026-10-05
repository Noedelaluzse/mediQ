import { ID_PERFIL_PROPIO, type Cuenta, type IdentidadDeUsuario } from '../domain/Cuenta';
import type { CuentasRepository } from '../domain/CuentasRepository';

/** RF-02: busca la cuenta del usuario; si no existe, la crea junto con su perfil propio. */
export class RegistrarCuenta {
  constructor(private readonly cuentas: CuentasRepository) {}

  async ejecutar(identidad: IdentidadDeUsuario): Promise<{ cuenta: Cuenta; primeraVez: boolean }> {
    const existente = await this.cuentas.buscar(identidad.usuarioId);
    if (existente) return { cuenta: existente, primeraVez: false };

    const nombreCompleto = identidad.nombre.trim() || identidad.email.split('@')[0];
    const cuenta: Cuenta = {
      ...identidad,
      perfilPropio: { id: ID_PERFIL_PROPIO, nombreCompleto, esPropio: true },
    };
    await this.cuentas.crear(cuenta);
    return { cuenta, primeraVez: true };
  }
}

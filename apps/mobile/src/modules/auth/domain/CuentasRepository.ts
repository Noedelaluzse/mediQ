import type { Cuenta } from './Cuenta';

export interface CuentasRepository {
  buscar(usuarioId: string): Promise<Cuenta | null>;
  crear(cuenta: Cuenta): Promise<void>;
}

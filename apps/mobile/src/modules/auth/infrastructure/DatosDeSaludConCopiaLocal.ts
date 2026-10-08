import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import { ETIQUETA_DE_SEXO, TIPOS_DE_SANGRE, type Alergias, type DatosDeSalud } from '../domain/DatosDeSalud';
import type { DatosDeSaludRepository } from '../domain/DatosDeSaludRepository';

const CLAVE = 'datos-de-salud';

const aTexto = (d: DatosDeSalud): string => JSON.stringify(d);

const esAlergias = (v: unknown): v is Alergias => {
  const a = v as Alergias | null;
  return typeof a === 'object' && a !== null && typeof a.sinConocidas === 'boolean' && Array.isArray(a.items) && a.items.every((i) => typeof i === 'string');
};

/** Lee la copia con cuidado: un texto dañado o con otra forma se ignora (devuelve null) en vez de enseñar datos de salud inventados. */
function deTexto(texto: string): DatosDeSalud | null {
  try {
    const v = JSON.parse(texto) as Partial<DatosDeSalud> | null;
    if (typeof v !== 'object' || v === null || !esAlergias(v.alergias) || !esAlergias(v.alergiasAMedicamentos)) return null;
    if (v.nacimiento !== undefined && typeof v.nacimiento !== 'string') return null;
    if (v.sexo !== undefined && !(v.sexo in ETIQUETA_DE_SEXO)) return null;
    if (v.tipoDeSangre !== undefined && !(TIPOS_DE_SANGRE as readonly string[]).includes(v.tipoDeSangre)) return null;
    return v as DatosDeSalud;
  } catch {
    return null;
  }
}

/**
 * «Mi salud» con copia local (RNF-11, F053): sin internet el Perfil muestra los últimos datos leídos en lugar de esconder la tarjeta.
 * Guardar pasa al servidor y deja la copia al día, para que guardar y quedarse sin internet enseguida no enseñe datos viejos.
 * Editar sigue necesitando internet (F032).
 */
export class DatosDeSaludConCopiaLocal implements DatosDeSaludRepository {
  constructor(
    private readonly real: DatosDeSaludRepository,
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  obtener(): Promise<DatosDeSalud> {
    return leerConCopia<DatosDeSalud>({ clave: CLAVE, copia: this.copia, red: this.red, leer: () => this.real.obtener(), aTexto, deTexto });
  }

  async guardar(datos: DatosDeSalud): Promise<void> {
    await this.real.guardar(datos);
    await this.copia.guardar(CLAVE, aTexto(datos)).catch(() => undefined);
  }
}

import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

const CLAVE_DE_LUGARES = 'lugares';
const CLAVE_DE_CONSULTAS = 'consultas-por-lugar';

function lugaresDeTexto(texto: string): Lugar[] | null {
  try {
    const valor: unknown = JSON.parse(texto);
    // Si algún elemento no tiene la forma esperada se ignora toda la copia: una lista «arreglada» a medias parecería un dato real.
    return Array.isArray(valor) && (valor as Lugar[]).every((l) => l && typeof l.id === 'string' && typeof l.nombre === 'string') ? (valor as Lugar[]) : null;
  } catch {
    return null;
  }
}

const consultasATexto = (m: Map<string, number>): string => JSON.stringify([...m]);

function consultasDeTexto(texto: string): Map<string, number> | null {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return null;
    const mapa = new Map<string, number>();
    for (const par of valor as [string, number][]) {
      if (!Array.isArray(par) || typeof par[0] !== 'string' || !Number.isInteger(par[1])) return null;
      mapa.set(par[0], par[1]);
    }
    return mapa;
  } catch {
    return null;
  }
}

/**
 * La lista de lugares y cuántas consultas tiene cada uno, con copia local (RNF-11, F053): sin internet se ve la pantalla de Lugares
 * y las sugerencias «Usados antes» al capturar una consulta. Lo demás (obtener, buscar, crear, renombrar, contar, eliminar) pasa directo.
 */
export class LugaresConCopiaLocal implements LugaresRepository {
  constructor(
    private readonly real: LugaresRepository,
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  listar(): Promise<Lugar[]> {
    return leerConCopia<Lugar[]>({ clave: CLAVE_DE_LUGARES, copia: this.copia, red: this.red, leer: () => this.real.listar(), aTexto: (l) => JSON.stringify(l), deTexto: lugaresDeTexto });
  }

  consultasPorLugar(ids?: string[]): Promise<Map<string, number>> {
    return leerConCopia<Map<string, number>>({ clave: CLAVE_DE_CONSULTAS, copia: this.copia, red: this.red, leer: () => this.real.consultasPorLugar(ids), aTexto: consultasATexto, deTexto: consultasDeTexto });
  }

  obtener(id: string) {
    return this.real.obtener(id);
  }
  buscarPorClave(clave: string) {
    return this.real.buscarPorClave(clave);
  }
  crear(lugar: Lugar) {
    return this.real.crear(lugar);
  }
  renombrar(id: string, nombre: string) {
    return this.real.renombrar(id, nombre);
  }
  contarConsultas(id: string) {
    return this.real.contarConsultas(id);
  }
  eliminar(id: string) {
    return this.real.eliminar(id);
  }
}

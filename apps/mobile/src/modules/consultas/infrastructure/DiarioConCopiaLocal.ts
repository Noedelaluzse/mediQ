import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { ConsultaDelDiario, CursorDelDiario, PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';

const CLAVE = 'diario';

const aTexto = (consultas: ConsultaDelDiario[]): string => JSON.stringify(consultas.map((c) => ({ ...c, fecha: c.fecha.toISOString() })));

function deTexto(texto: string): ConsultaDelDiario[] | null {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return null;
    const consultas: ConsultaDelDiario[] = [];
    for (const v of valor as (Omit<ConsultaDelDiario, 'fecha'> & { fecha?: string })[]) {
      const fecha = new Date(v?.fecha ?? '');
      if (!v || typeof v.id !== 'string' || Number.isNaN(fecha.getTime())) continue;
      consultas.push({ ...v, fecha });
    }
    return consultas;
  } catch {
    return null;
  }
}

/**
 * Diario con copia local (RNF-11): la primera página (la más reciente) se guarda en el teléfono cada vez que se lee con internet, y sin
 * internet se muestra esa copia, sin «ver más». Las páginas siguientes (con cursor) no se copian: sin internet fallan.
 */
export class DiarioConCopiaLocal implements DiarioRepository {
  constructor(
    private readonly real: DiarioRepository,
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  async pagina(cursor?: CursorDelDiario): Promise<PaginaDelDiario> {
    if (cursor) return this.real.pagina(cursor);
    let siguiente: CursorDelDiario | undefined;
    const consultas = await leerConCopia<ConsultaDelDiario[]>({
      clave: CLAVE,
      copia: this.copia,
      red: this.red,
      leer: async () => {
        const p = await this.real.pagina();
        siguiente = p.siguiente;
        return p.consultas;
      },
      aTexto,
      deTexto,
    });
    return { consultas, ...(siguiente ? { siguiente } : {}) };
  }
}

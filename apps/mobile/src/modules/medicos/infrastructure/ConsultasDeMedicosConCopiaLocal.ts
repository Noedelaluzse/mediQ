import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { ResumenDeConsultas } from '../domain/Consultas';

const CLAVE = 'resumen-por-medico';
const CLAVE_DE_TOTALES = 'totales-de-consultas';

type Totales = { consultas: number; conReceta: number };

const totalesATexto = (t: Totales): string => JSON.stringify(t);

function totalesDeTexto(texto: string): Totales | null {
  try {
    const v = JSON.parse(texto) as Partial<Totales> | null;
    return v && Number.isInteger(v.consultas) && Number.isInteger(v.conReceta) ? { consultas: v.consultas as number, conReceta: v.conReceta as number } : null;
  } catch {
    return null;
  }
}

type Resumen = Map<string, ResumenDeConsultas>;

const aTexto = (r: Resumen): string => JSON.stringify([...r].map(([id, v]) => [id, { ...v, ultimaVisita: v.ultimaVisita?.toISOString() }]));

function deTexto(texto: string): Resumen | null {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return null;
    const resumen: Resumen = new Map();
    for (const par of valor as [string, Omit<ResumenDeConsultas, 'ultimaVisita'> & { ultimaVisita?: string }][]) {
      const [id, v] = par ?? [];
      if (typeof id !== 'string' || !v || typeof v.consultas !== 'number') continue;
      const ultima = v.ultimaVisita ? new Date(v.ultimaVisita) : undefined;
      resumen.set(id, { consultas: v.consultas, lugares: Array.isArray(v.lugares) ? v.lugares : [], ...(ultima && !Number.isNaN(ultima.getTime()) ? { ultimaVisita: ultima } : {}) });
    }
    return resumen;
  } catch {
    return null;
  }
}

/** El resumen por médico y los totales del Perfil con copia local (RNF-11, F053): sin internet se ve lo último que se leyó. Lo demás pasa directo. */
export class ConsultasDeMedicosConCopiaLocal implements ConsultasDeMedicosRepository {
  constructor(
    private readonly real: ConsultasDeMedicosRepository,
    private readonly copia: CopiaLocal,
    private readonly red: Conectividad,
  ) {}

  resumenPorMedico(): Promise<Resumen> {
    return leerConCopia<Resumen>({ clave: CLAVE, copia: this.copia, red: this.red, leer: () => this.real.resumenPorMedico(), aTexto, deTexto });
  }

  deMedico(medicoId: string) {
    return this.real.deMedico(medicoId);
  }
  totales(): Promise<Totales> {
    return leerConCopia<Totales>({ clave: CLAVE_DE_TOTALES, copia: this.copia, red: this.red, leer: () => this.real.totales(), aTexto: totalesATexto, deTexto: totalesDeTexto });
  }
}

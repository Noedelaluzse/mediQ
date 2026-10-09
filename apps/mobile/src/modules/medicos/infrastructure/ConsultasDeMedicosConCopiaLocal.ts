import type { Conectividad } from '@/shared/kernel/Conectividad';
import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';
import { leerConCopia } from '@/shared/kernel/leerConCopia';

import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { ConsultaDeMedico, ResumenBasicoDeConsultas, ResumenDeConsultas } from '../domain/Consultas';

const CLAVE = 'resumen-por-medico';
const CLAVE_DE_TOTALES = 'totales-de-consultas';
const CLAVE_BASICA = 'resumen-basico-por-medico';

type Totales = { consultas: number; conReceta: number };

const consultasATexto = (consultas: ConsultaDeMedico[]): string => JSON.stringify(consultas.map((c) => ({ ...c, fecha: c.fecha.toISOString() })));

function consultasDeTexto(texto: string): ConsultaDeMedico[] | null {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return null;
    const consultas: ConsultaDeMedico[] = [];
    for (const v of valor as (Omit<ConsultaDeMedico, 'fecha'> & { fecha?: string })[]) {
      const fecha = new Date(v?.fecha ?? '');
      if (!v || typeof v.id !== 'string' || Number.isNaN(fecha.getTime())) continue;
      consultas.push({ ...v, fecha });
    }
    return consultas;
  } catch {
    return null;
  }
}

const totalesATexto = (t: Totales): string => JSON.stringify(t);

function totalesDeTexto(texto: string): Totales | null {
  try {
    const v = JSON.parse(texto) as Partial<Totales> | null;
    return v && Number.isInteger(v.consultas) && Number.isInteger(v.conReceta) ? { consultas: v.consultas as number, conReceta: v.conReceta as number } : null;
  } catch {
    return null;
  }
}

type Basico = Map<string, ResumenBasicoDeConsultas>;

const basicoATexto = (r: Basico): string => JSON.stringify([...r].map(([id, v]) => [id, { consultas: v.consultas, ultimaVisita: v.ultimaVisita?.toISOString() }]));

function basicoDeTexto(texto: string): Basico | null {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!Array.isArray(valor)) return null;
    const resumen: Basico = new Map();
    for (const par of valor as [string, { consultas?: number; ultimaVisita?: string }][]) {
      const [id, v] = par ?? [];
      if (typeof id !== 'string' || !v || typeof v.consultas !== 'number') continue;
      const ultima = v.ultimaVisita ? new Date(v.ultimaVisita) : undefined;
      resumen.set(id, { consultas: v.consultas, ...(ultima && !Number.isNaN(ultima.getTime()) ? { ultimaVisita: ultima } : {}) });
    }
    return resumen;
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

  /** El directorio de médicos (consultas y última visita, sin lugares) con su propia copia: no pisa el resumen completo de «Elegir médico». */
  resumenBasicoPorMedico(medicoIds: string[]): Promise<Map<string, ResumenBasicoDeConsultas>> {
    return leerConCopia<Map<string, ResumenBasicoDeConsultas>>({ clave: CLAVE_BASICA, copia: this.copia, red: this.red, leer: () => this.real.resumenBasicoPorMedico(medicoIds), aTexto: basicoATexto, deTexto: basicoDeTexto });
  }

  /** Las consultas de un médico se copian la primera vez que se abre su detalle con internet; sin internet se ve esa copia (F053). */
  deMedico(medicoId: string): Promise<ConsultaDeMedico[]> {
    return leerConCopia<ConsultaDeMedico[]>({ clave: `consultas-de-medico:${medicoId}`, copia: this.copia, red: this.red, leer: () => this.real.deMedico(medicoId), aTexto: consultasATexto, deTexto: consultasDeTexto });
  }
  totales(): Promise<Totales> {
    return leerConCopia<Totales>({ clave: CLAVE_DE_TOTALES, copia: this.copia, red: this.red, leer: () => this.real.totales(), aTexto: totalesATexto, deTexto: totalesDeTexto });
  }
}

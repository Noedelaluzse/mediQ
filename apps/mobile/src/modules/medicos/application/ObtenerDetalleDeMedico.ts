import type { ConsultaDeMedico } from '../domain/Consultas';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

export interface DetalleDeMedico {
  medico: Medico;
  consultas: number;
  ultimaVisita?: Date;
  /** Dónde lo atendió, del lugar más frecuente al menos. */
  lugares: { nombre: string; consultas: number }[];
  /** Las más recientes (hasta 3). */
  recientes: ConsultaDeMedico[];
}

const RECIENTES = 3;

export class ObtenerDetalleDeMedico {
  constructor(
    private readonly medicos: MedicosRepository,
    private readonly consultas: ConsultasDeMedicosRepository,
  ) {}

  async ejecutar(id: string): Promise<DetalleDeMedico | null> {
    const medico = await this.medicos.obtener(id);
    if (!medico) return null;
    const todas = await this.consultas.deMedico(id);

    const porLugar = new Map<string, number>();
    for (const c of todas) if (c.lugar) porLugar.set(c.lugar, (porLugar.get(c.lugar) ?? 0) + 1);

    return {
      medico,
      consultas: todas.length,
      ultimaVisita: todas[0]?.fecha,
      lugares: [...porLugar].map(([nombre, consultas]) => ({ nombre, consultas })).sort((a, b) => b.consultas - a.consultas || a.nombre.localeCompare(b.nombre, 'es')),
      recientes: todas.slice(0, RECIENTES),
    };
  }
}

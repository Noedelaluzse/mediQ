import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

export interface LugarConConsultas {
  lugar: Lugar;
  consultas: number;
}

export class ListarLugares {
  constructor(private readonly lugares: LugaresRepository) {}

  async ejecutar(): Promise<LugarConConsultas[]> {
    const todos = (await this.lugares.listar()).sort((a, b) =>
      claveDeLugar(a.nombre).localeCompare(claveDeLugar(b.nombre), 'es'),
    );
    // Una sola lectura para todos los lugares (antes era una consulta por lugar) y con copia local sirve también sin internet (F053).
    const consultas = await this.lugares.consultasPorLugar(todos.map((l) => l.id));
    return todos.map((lugar) => ({ lugar, consultas: consultas.get(lugar.id) ?? 0 }));
  }
}

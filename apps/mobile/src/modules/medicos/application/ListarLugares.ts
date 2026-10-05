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
    return Promise.all(todos.map(async (lugar) => ({ lugar, consultas: await this.lugares.contarConsultas(lugar.id) })));
  }
}

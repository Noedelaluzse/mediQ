import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

const SUGERENCIAS = 5;

/** Sugerencias "Usados antes" para el campo de lugar: del más usado al menos. */
export class ListarLugaresUsadosAntes {
  constructor(private readonly lugares: LugaresRepository) {}

  async ejecutar(limite: number = SUGERENCIAS): Promise<Lugar[]> {
    const todos = await this.lugares.listar();
    const conUso = await Promise.all(todos.map(async (lugar) => ({ lugar, usos: await this.lugares.contarConsultas(lugar.id) })));
    return conUso
      .sort((a, b) => b.usos - a.usos || claveDeLugar(a.lugar.nombre).localeCompare(claveDeLugar(b.lugar.nombre), 'es'))
      .slice(0, limite)
      .map((x) => x.lugar);
  }
}

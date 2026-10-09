import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';

const SUGERENCIAS = 5;

/** Sugerencias "Usados antes" para el campo de lugar: del más usado al menos. */
export class ListarLugaresUsadosAntes {
  constructor(private readonly lugares: LugaresRepository) {}

  async ejecutar(limite: number = SUGERENCIAS): Promise<Lugar[]> {
    const todos = await this.lugares.listar();
    const usos = await this.lugares.consultasPorLugar(todos.map((l) => l.id));
    const conUso = todos.map((lugar) => ({ lugar, usos: usos.get(lugar.id) ?? 0 }));
    return conUso
      .sort((a, b) => b.usos - a.usos || claveDeLugar(a.lugar.nombre).localeCompare(claveDeLugar(b.lugar.nombre), 'es'))
      .slice(0, limite)
      .map((x) => x.lugar);
  }
}

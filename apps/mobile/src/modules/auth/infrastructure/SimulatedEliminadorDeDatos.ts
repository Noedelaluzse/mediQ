import type { EliminadorDeDatos } from '../domain/EliminadorDeDatos';

/** Modo simulado (Expo Go, sin Firebase): no hay datos remotos que borrar. */
export class SimulatedEliminadorDeDatos implements EliminadorDeDatos {
  async eliminarTodo(): Promise<void> {}
}

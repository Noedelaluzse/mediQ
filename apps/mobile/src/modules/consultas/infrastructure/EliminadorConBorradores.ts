import { diagnostico } from '@/shared/kernel/diagnostico';

/** Añade al borrado remoto de la cuenta el del borrador local y el de las fotos de recetas guardadas en el teléfono (RNF-07, F051). Implementa el puerto `EliminadorDeDatos` de auth. */
export class EliminadorConBorradores {
  constructor(
    private readonly remoto: { eliminarTodo(usuarioId: string): Promise<void> },
    private readonly borradores: { borrar(): Promise<void> },
    private readonly fotos: { limpiar(): Promise<void> },
  ) {}

  async eliminarTodo(usuarioId: string): Promise<void> {
    await this.remoto.eliminarTodo(usuarioId); // si falla, se reintenta todo: es idempotente
    try {
      await this.borradores.borrar();
    } catch (error) {
      // Un fallo local no debe impedir que la cuenta ya borrada cierre su sesión.
      diagnostico.advertir('no se pudo borrar el borrador local', error);
    }
    try {
      await this.fotos.limpiar();
    } catch (error) {
      diagnostico.advertir('no se pudieron borrar las fotos guardadas en el teléfono', error);
    }
  }
}

/** Añade al borrado remoto de la cuenta el del borrador local (RNF-07). Implementa el puerto `EliminadorDeDatos` de auth. */
export class EliminadorConBorradores {
  constructor(
    private readonly remoto: { eliminarTodo(usuarioId: string): Promise<void> },
    private readonly borradores: { borrar(): Promise<void> },
  ) {}

  async eliminarTodo(usuarioId: string): Promise<void> {
    await this.remoto.eliminarTodo(usuarioId); // si falla, se reintenta todo: es idempotente
    try {
      await this.borradores.borrar();
    } catch (error) {
      // Un fallo local no debe impedir que la cuenta ya borrada cierre su sesión.
      console.warn('[MediQ] no se pudo borrar el borrador local', error);
    }
  }
}

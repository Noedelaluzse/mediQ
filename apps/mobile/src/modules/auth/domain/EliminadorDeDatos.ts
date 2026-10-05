/** Puerto: borra todos los datos del usuario (documentos y, cuando existan, archivos). Lanza si falla. */
export interface EliminadorDeDatos {
  eliminarTodo(usuarioId: string): Promise<void>;
}

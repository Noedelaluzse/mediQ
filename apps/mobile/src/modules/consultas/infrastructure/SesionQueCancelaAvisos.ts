/**
 * Decora el almacén de sesión: al borrar la sesión (cerrar sesión o eliminar la cuenta) cancela antes los avisos de citas, para que
 * no sigan sonando datos de médicos de una cuenta que ya no está. Un fallo al cancelar no impide borrar la sesión.
 */
export class SesionQueCancelaAvisos<S> {
  constructor(
    private readonly sesiones: { leer(): Promise<S | null>; guardar(sesion: S): Promise<void>; borrar(): Promise<void> },
    private readonly avisos: { cancelarTodos(): Promise<void> },
  ) {}

  leer() {
    return this.sesiones.leer();
  }

  guardar(sesion: S) {
    return this.sesiones.guardar(sesion);
  }

  async borrar(): Promise<void> {
    try {
      await this.avisos.cancelarTodos();
    } catch (error) {
      console.warn('[MediQ] no se pudieron cancelar los avisos de citas', error);
    }
    await this.sesiones.borrar();
  }
}

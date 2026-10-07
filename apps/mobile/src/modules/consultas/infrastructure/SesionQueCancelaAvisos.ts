/**
 * Decora el almacén de sesión: al borrar la sesión (cerrar sesión o eliminar la cuenta) cancela antes los avisos de citas, para que
 * no sigan sonando datos de médicos de una cuenta que ya no está, y ejecuta las `limpiezasLocales` (copia de lectura y cola de envío
 * del teléfono: datos de salud que no deben quedar para el siguiente usuario). Se hace con la sesión todavía activa, porque esos
 * datos se guardan por usuario. Un fallo en cualquiera de esos pasos no impide borrar la sesión.
 */
export class SesionQueCancelaAvisos<S> {
  constructor(
    private readonly sesiones: { leer(): Promise<S | null>; guardar(sesion: S): Promise<void>; borrar(): Promise<void> },
    private readonly avisos: { cancelarTodos(): Promise<void> },
    private readonly limpiezasLocales: (() => Promise<void>)[] = [],
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
    for (const limpiar of this.limpiezasLocales) {
      try {
        await limpiar();
      } catch (error) {
        console.warn('[MediQ] no se pudo limpiar un dato local', error);
      }
    }
    await this.sesiones.borrar();
  }
}

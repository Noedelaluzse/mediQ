/** `failed-precondition` es lo que responde Firestore cuando la consulta necesita un índice compuesto que aún no existe o se está construyendo. */
export const esFaltaDeIndice = (error: unknown): boolean => (error as { code?: string } | null | undefined)?.code === 'failed-precondition';

/**
 * Usa la consulta con filtro en el servidor y, si Firestore dice que falta el índice, el método anterior (descartar las borradas en el teléfono)
 * (F077, AUD-12 parte 2). Así el orden entre desplegar el índice y publicar la app no importa: mientras el índice no esté listo, todo sigue como
 * antes y la persona no ve ningún error. Tras un fallo por índice se usa el método anterior durante `esperaMs` y luego se vuelve a probar el
 * servidor (el índice ya pudo construirse). Cualquier otro error (permisos, red, un bug) sube tal cual: no se esconde detrás del respaldo.
 */
export class RespaldoPorIndice {
  private noAntesDe = 0;

  constructor(
    private readonly ahora: () => number = Date.now,
    private readonly esperaMs: number = 5 * 60_000,
  ) {}

  async ejecutar<T>(conIndice: () => Promise<T>, sinIndice: () => Promise<T>): Promise<T> {
    if (this.ahora() < this.noAntesDe) return sinIndice();
    try {
      return await conIndice();
    } catch (error) {
      if (!esFaltaDeIndice(error)) throw error;
      this.noAntesDe = this.ahora() + this.esperaMs;
      return sinIndice();
    }
  }
}

import { VIGENCIA_DE_DATOS_MS } from './frescura';
import { versionDeDatos } from './versionDeDatos';

/**
 * Una lectura hecha UNA sola vez y repartida a quien la pida (F070, AUD-10). Al abrir el Diario varias cosas le preguntaban lo mismo a Firebase
 * a la vez (la tarjeta «Hoy» y los avisos de toma, la tarjeta «Próxima cita» y los avisos de citas): ahora la primera hace el viaje y las demás
 * reciben lo mismo. Se vuelve a leer cuando:
 *  - cambió algo en la app (`versionDeDatos`: se guardó, editó o borró algo, o se cerró sesión), o
 *  - pasó la vigencia (la misma de F058: 1 minuto), por si cambió desde otro aparato, o
 *  - se pregunta otra cosa (otra `clave`).
 * Si la lectura falla, el fallo NO se guarda. Una lectura que empezó antes de una escritura queda vieja para quien pregunte después.
 */
export class LecturaCompartida<T> {
  private entrada: { clave: string; version: number; hasta: number; promesa: Promise<T> } | null = null;

  constructor(
    private readonly ahora: () => number = Date.now,
    private readonly vigenciaMs: number = VIGENCIA_DE_DATOS_MS,
    private readonly version: () => number = versionDeDatos,
  ) {}

  ejecutar(clave: string, leer: () => Promise<T>): Promise<T> {
    const version = this.version();
    const ahora = this.ahora();
    const e = this.entrada;
    if (e && e.clave === clave && e.version === version && ahora < e.hasta) return e.promesa;

    const promesa = leer();
    const nueva = { clave, version, hasta: ahora + this.vigenciaMs, promesa };
    this.entrada = nueva;
    promesa.catch(() => {
      if (this.entrada === nueva) this.entrada = null;
    });
    return promesa;
  }

  /** Descarta lo guardado: la próxima llamada lee de nuevo. */
  limpiar(): void {
    this.entrada = null;
  }
}

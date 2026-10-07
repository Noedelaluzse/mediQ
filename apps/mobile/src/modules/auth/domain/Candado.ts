/** Cuánto tiempo puede estar la app en segundo plano sin volver a pedir Face ID / huella. */
export const GRACIA_DEL_CANDADO_MS = 60_000;

/** Lo que el teléfono permite: con sensor y con una cara/huella registrada, solo con sensor, o sin nada. */
export type Disponibilidad = 'disponible' | 'sinRegistro' | 'sinSensor';

export type ResultadoBiometrico = 'ok' | 'cancelado' | 'fallo' | 'noDisponible';

/** Puerto: Face ID / huella del teléfono (con el código del teléfono como respaldo). */
export interface Biometria {
  disponibilidad(): Promise<Disponibilidad>;
  autenticar(mensaje: string): Promise<ResultadoBiometrico>;
}

/** Lo que se recuerda en este teléfono: si el candado está activado y si ya se le ofreció al usuario. */
export type PreferenciaDelCandado = { activado: boolean; ofrecido: boolean };

export interface PreferenciaDelCandadoStore {
  leer(): Promise<PreferenciaDelCandado>;
  guardar(preferencia: PreferenciaDelCandado): Promise<void>;
  limpiar(): Promise<void>;
}

export const preferenciaInicial = (): PreferenciaDelCandado => ({ activado: false, ofrecido: false });

/**
 * ¿Hay que pedir Face ID ahora? `salioEnMs` es cuándo la app pasó a segundo plano (null = la app se abrió de cero: siempre se pide).
 * Si el reloj retrocedió (salida «en el futuro») se pide, por si acaso.
 */
export function debeBloquear({ activado, salioEnMs, ahoraMs }: { activado: boolean; salioEnMs: number | null; ahoraMs: number }): boolean {
  if (!activado) return false;
  if (salioEnMs === null) return true;
  const fuera = ahoraMs - salioEnMs;
  return fuera < 0 || fuera > GRACIA_DEL_CANDADO_MS;
}

/** La oferta «¿Quieres usar Face ID?» sale una sola vez, y solo si el teléfono puede. */
export const ofertaDelCandado = (preferencia: PreferenciaDelCandado, disponibilidad: Disponibilidad): boolean =>
  disponibilidad === 'disponible' && !preferencia.activado && !preferencia.ofrecido;

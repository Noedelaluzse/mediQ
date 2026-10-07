import type { EntradaRegistrarConsulta } from './EntradaDeConsulta';

/**
 * Una consulta capturada que aún no llegó al servidor (F030, RNF-11). `id` es el de la consulta futura: se reserva al capturarla
 * para que reenviar (aun después de un envío que sí llegó pero sin confirmación) reescriba el mismo documento y no lo duplique.
 */
export interface ConsultaPendiente {
  id: string;
  entrada: EntradaRegistrarConsulta;
  creadaEn: Date;
  /** Veces que el envío falló por falta de red. */
  intentos: number;
  /** Presente cuando el servidor la rechazó: ya no se reintenta sola; el usuario decide (descartarla). */
  error?: string;
}

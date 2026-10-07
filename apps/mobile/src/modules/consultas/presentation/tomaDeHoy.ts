import type { TomaDelDia } from '../domain/TomasDelDia';
import type { TomaDeHoy } from './TarjetaDeHoy';

/** «8:00», «0:00», «21:05»: sin cero inicial, como en el resumen de la receta. */
const hora = (f: Date): string => `${f.getHours()}:${String(f.getMinutes()).padStart(2, '0')}`;

/** Una toma del día tal como la dibuja la tarjeta «Hoy». */
export const aTomaDeHoy = (t: TomaDelDia): TomaDeHoy => ({
  id: t.tomaId,
  titulo: t.toma.dosis ? `${t.toma.medicamento} · ${t.toma.dosis}` : t.toma.medicamento,
  hora: hora(t.toma.programadaPara),
  estado: t.estado,
  ...(t.estado === 'tomada' && t.tomadaEn ? { tomadaA: hora(t.tomadaEn) } : {}),
});

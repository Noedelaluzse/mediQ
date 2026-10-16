import { fechaDeHoy } from '@/shared/kernel/fechas';

import type { CoberturaDeAvisos } from '../domain/Toma';
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

/** F074: si los avisos programados no cubren todo el tratamiento, lo dice con la fecha real; con cobertura completa no dice nada. */
export function textoDeCobertura(cobertura: CoberturaDeAvisos | null): string | null {
  if (cobertura === null || cobertura.completa || cobertura.hasta === null) return null;
  const dia = fechaDeHoy(cobertura.hasta);
  return `Tus avisos llegan hasta el ${dia.charAt(0).toLowerCase()}${dia.slice(1)}. Abre MediQ antes para renovarlos.`;
}

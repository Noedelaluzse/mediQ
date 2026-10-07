import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import { datosDeTarjeta, type DatosDeTarjeta } from './tarjetaDelDiario';

export interface TarjetaPendiente extends DatosDeTarjeta {
  id: string;
  estado: 'por-enviar' | 'rechazada';
  etiqueta: 'Pendiente de enviar' | 'No se pudo enviar';
  /** Solo si el servidor la rechazó. */
  motivoDelError?: string;
}

/** Una consulta de la cola dibujada como una del diario (mismo título y resumen), con su etiqueta de estado. */
export function aTarjetaPendiente(c: ConsultaPendiente): TarjetaPendiente {
  const e = c.entrada;
  const base = datosDeTarjeta({ id: c.id, fecha: e.fecha, especialidad: e.especialidad, tipo: '', medicoNombre: e.medicoNombre, lugar: e.lugar, motivo: e.motivo, notasDelMedico: e.notasDelMedico });
  return c.error ? { ...base, id: c.id, estado: 'rechazada', etiqueta: 'No se pudo enviar', motivoDelError: c.error } : { ...base, id: c.id, estado: 'por-enviar', etiqueta: 'Pendiente de enviar' };
}

const consultas = (n: number): string => (n === 1 ? '1 consulta' : `${n} consultas`);

/** La franja de arriba del Diario según haya o no internet y cuántas consultas esperan; null si no hay nada que decir. */
export function avisoDeConexion(conectado: boolean, porEnviar: number): { titulo: string; texto: string } | null {
  if (!conectado) {
    return {
      titulo: 'Sin conexión',
      texto:
        porEnviar === 0
          ? 'Estás viendo lo último que se guardó. Lo que captures se enviará solo al volver el internet.'
          : porEnviar === 1
            ? 'Tienes 1 consulta por enviar; se enviará sola al volver el internet.'
            : `Tienes ${porEnviar} consultas por enviar; se enviarán solas al volver el internet.`,
    };
  }
  return porEnviar > 0 ? { titulo: 'Enviando tus consultas', texto: `${consultas(porEnviar)} por enviar…` } : null;
}

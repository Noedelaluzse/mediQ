/** La cita de seguimiento que el paciente anotó en una consulta (`nextAppointmentAt`). */
export interface ProximaCita {
  /** La consulta que la programó (el detalle se abre desde ahí). */
  consultaId: string;
  fecha: Date;
  especialidad: string;
  medicoNombre?: string;
}

export const esFutura = (c: ProximaCita, ahora: Date): boolean => c.fecha.getTime() > ahora.getTime();

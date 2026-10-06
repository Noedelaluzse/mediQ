/** Una notificación local programada en el teléfono (cita o toma de un medicamento). */
export interface AvisoLocal {
  id: string;
  consultaId: string;
  cuando: Date;
  titulo: string;
  cuerpo: string;
}

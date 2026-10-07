/** Lo que el formulario entrega para registrar una consulta. Es la misma entrada que se guarda en la cola de envío (F030). */
export interface EntradaRegistrarConsulta {
  fecha: Date;
  especialidad: string;
  lugar?: string;
  consultorio?: string;
  /** Presente solo si el paciente eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre?: string;
  medicoTelefono?: string;
  medicoCedula?: string;
  motivo?: string;
  notasDelMedico?: string;
  /** Textos de las indicaciones, en orden; las vacías se ignoran. */
  indicaciones?: string[];
  proximaCita?: Date;
}

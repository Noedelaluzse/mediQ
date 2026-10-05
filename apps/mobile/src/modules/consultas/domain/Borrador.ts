/** Lo que el paciente lleva escrito en "Nueva consulta". Fechas como texto ISO para poder guardarlo tal cual. */
export interface BorradorDeConsulta {
  fecha: string;
  hora: string;
  tipo: string;
  especialidad: string;
  lugar: string;
  consultorio: string;
  /** Solo si eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre: string;
  medicoTelefono: string;
  medicoCedula: string;
  motivo: string;
  indicaciones: string;
  proximaCita: string | null;
}

const CAMPOS_DE_TEXTO = ['lugar', 'consultorio', 'medicoNombre', 'medicoTelefono', 'medicoCedula', 'motivo', 'indicaciones'] as const;

/** Un formulario sin escribir nada (fecha, tipo y especialidad por defecto no cuentan) no merece guardarse. */
export const esBorradorVacio = (b: BorradorDeConsulta): boolean =>
  b.proximaCita === null && CAMPOS_DE_TEXTO.every((c) => b[c].trim() === '');

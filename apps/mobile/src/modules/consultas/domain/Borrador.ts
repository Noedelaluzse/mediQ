/** Lo que el paciente lleva escrito en "Nueva consulta". Fechas como texto ISO para poder guardarlo tal cual. */
export interface BorradorDeConsulta {
  fecha: string;
  hora: string;
  especialidad: string;
  lugar: string;
  consultorio: string;
  /** Solo si eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre: string;
  medicoTelefono: string;
  medicoCedula: string;
  motivo: string;
  notasDelMedico: string;
  /** Las indicaciones ya agregadas (textos); un borrador viejo puede no traerlas. */
  indicaciones: string[];
  proximaCita: string | null;
}

const CAMPOS_DE_TEXTO = ['lugar', 'consultorio', 'medicoNombre', 'medicoTelefono', 'medicoCedula', 'motivo', 'notasDelMedico'] as const;

/** Un formulario sin escribir nada (fecha y especialidad por defecto no cuentan) no merece guardarse. */
export const esBorradorVacio = (b: BorradorDeConsulta): boolean =>
  b.proximaCita === null && (b.indicaciones ?? []).length === 0 && CAMPOS_DE_TEXTO.every((c) => b[c].trim() === '');

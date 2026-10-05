/** Teléfono de un médico del directorio (la consulta solo guarda su id y nombre). */
export interface ContactoDeMedico {
  telefonoDe(medicoId: string): Promise<string | undefined>;
}

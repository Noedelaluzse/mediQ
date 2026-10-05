import type { DatosDeMedicoParaConsulta } from '@/modules/medicos/application/ElegirMedicoGuardado';

import type { EntradaRegistrarConsulta } from '../application/RegistrarConsulta';
import type { BorradorDeConsulta } from '../domain/Borrador';

export interface EstadoDeConsulta {
  fecha: Date;
  hora: Date;
  tipo: string;
  especialidad: string;
  lugar: string;
  consultorio: string;
  /** Solo si el paciente eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre: string;
  medicoTelefono: string;
  medicoCedula: string;
  motivo: string;
  indicaciones: string;
  proximaCita: Date | null;
}

export const estadoInicial = (ahora: Date): EstadoDeConsulta => ({
  fecha: ahora,
  hora: ahora,
  tipo: 'general',
  especialidad: 'medicina-general',
  lugar: '',
  consultorio: '',
  medicoId: undefined,
  medicoNombre: '',
  medicoTelefono: '',
  medicoCedula: '',
  motivo: '',
  indicaciones: '',
  proximaCita: null,
});

/** Día de `fecha` + hora y minutos de `hora`, con segundos en cero. */
export const combinarFechaYHora = (fecha: Date, hora: Date): Date =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hora.getHours(), hora.getMinutes(), 0, 0);

/** General y Dentista implican su especialidad; los demás tipos dejan la que el paciente eligió. */
export function cambiarTipo(e: EstadoDeConsulta, tipo: string): EstadoDeConsulta {
  const especialidad = tipo === 'dentista' ? 'odontologia' : tipo === 'general' ? 'medicina-general' : e.especialidad;
  return { ...e, tipo, especialidad };
}

/** El tipo que corresponde a una especialidad; Urgencias y Otro se respetan si el paciente ya los eligió. */
function tipoParaEspecialidad(tipoActual: string, especialidad: string): string {
  if (especialidad === 'medicina-general') return 'general';
  if (especialidad === 'odontologia') return 'dentista';
  return tipoActual === 'general' || tipoActual === 'dentista' ? 'especialista' : tipoActual;
}

/** HU-08: "Elegir guardado" llena nombre, especialidad (y su tipo), teléfono, cédula y el lugar (si aún estaba vacío). */
export const aplicarMedicoElegido = (e: EstadoDeConsulta, d: DatosDeMedicoParaConsulta): EstadoDeConsulta => ({
  ...e,
  tipo: tipoParaEspecialidad(e.tipo, d.especialidad),
  medicoId: d.medicoId,
  medicoNombre: d.nombre,
  especialidad: d.especialidad,
  medicoTelefono: d.telefono ?? '',
  medicoCedula: d.cedula ?? '',
  lugar: e.lugar.trim() ? e.lugar : (d.lugar ?? ''),
});

/** Cambiar el nombre de un médico elegido lo convierte en uno distinto (se guardará como nuevo). */
export const editarNombreDelMedico = (e: EstadoDeConsulta, nombre: string): EstadoDeConsulta => ({
  ...e,
  medicoNombre: nombre,
  medicoId: nombre === e.medicoNombre ? e.medicoId : undefined,
});

export const aEntrada = (e: EstadoDeConsulta): EntradaRegistrarConsulta => ({
  fecha: combinarFechaYHora(e.fecha, e.hora),
  tipo: e.tipo,
  especialidad: e.especialidad,
  lugar: e.lugar,
  consultorio: e.consultorio,
  medicoId: e.medicoId,
  medicoNombre: e.medicoNombre,
  medicoTelefono: e.medicoTelefono,
  medicoCedula: e.medicoCedula,
  motivo: e.motivo,
  indicaciones: e.indicaciones,
  proximaCita: e.proximaCita ?? undefined,
});

/** El formulario como texto guardable (fechas ISO). */
export const aBorrador = (e: EstadoDeConsulta): BorradorDeConsulta => ({
  fecha: e.fecha.toISOString(),
  hora: e.hora.toISOString(),
  tipo: e.tipo,
  especialidad: e.especialidad,
  lugar: e.lugar,
  consultorio: e.consultorio,
  medicoId: e.medicoId,
  medicoNombre: e.medicoNombre,
  medicoTelefono: e.medicoTelefono,
  medicoCedula: e.medicoCedula,
  motivo: e.motivo,
  indicaciones: e.indicaciones,
  proximaCita: e.proximaCita ? e.proximaCita.toISOString() : null,
});

const fechaValida = (texto: string | null, alternativa: Date | null): Date | null => {
  if (!texto) return alternativa;
  const f = new Date(texto);
  return Number.isNaN(f.getTime()) ? alternativa : f;
};

/** Restaura el formulario desde un borrador; una fecha dañada cae en `ahora` (o en "sin próxima cita"). */
export const deBorrador = (b: BorradorDeConsulta, ahora: Date): EstadoDeConsulta => ({
  fecha: fechaValida(b.fecha, ahora) ?? ahora,
  hora: fechaValida(b.hora, ahora) ?? ahora,
  tipo: b.tipo,
  especialidad: b.especialidad,
  lugar: b.lugar,
  consultorio: b.consultorio,
  medicoId: b.medicoId,
  medicoNombre: b.medicoNombre,
  medicoTelefono: b.medicoTelefono,
  medicoCedula: b.medicoCedula,
  motivo: b.motivo,
  indicaciones: b.indicaciones,
  proximaCita: fechaValida(b.proximaCita, null),
});

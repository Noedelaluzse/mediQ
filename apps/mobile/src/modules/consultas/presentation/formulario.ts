import type { DatosDeMedicoParaConsulta } from '@/modules/medicos/application/ElegirMedicoGuardado';

import type { EntradaRegistrarConsulta } from '../application/RegistrarConsulta';
import type { BorradorDeConsulta } from '../domain/Borrador';
import type { Consulta } from '../domain/Consulta';
import { MAXIMO_DE_INDICACIONES } from '../domain/Indicacion';

export interface EstadoDeConsulta {
  fecha: Date;
  hora: Date;
  especialidad: string;
  lugar: string;
  consultorio: string;
  /** Solo si el paciente eligió un médico de los guardados. */
  medicoId?: string;
  medicoNombre: string;
  medicoTelefono: string;
  medicoCedula: string;
  motivo: string;
  notasDelMedico: string;
  /** Indicaciones ya agregadas, en orden (RF-15). */
  indicaciones: string[];
  proximaCita: Date | null;
}

export const estadoInicial = (ahora: Date): EstadoDeConsulta => ({
  fecha: ahora,
  hora: ahora,
  especialidad: 'medicina-general',
  lugar: '',
  consultorio: '',
  medicoId: undefined,
  medicoNombre: '',
  medicoTelefono: '',
  medicoCedula: '',
  motivo: '',
  notasDelMedico: '',
  indicaciones: [],
  proximaCita: null,
});

/** Día de `fecha` + hora y minutos de `hora`, con segundos en cero. */
export const combinarFechaYHora = (fecha: Date, hora: Date): Date =>
  new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hora.getHours(), hora.getMinutes(), 0, 0);

/** HU-08: "Elegir guardado" llena nombre, especialidad, teléfono, cédula y el lugar (si aún estaba vacío). */
export const aplicarMedicoElegido = (e: EstadoDeConsulta, d: DatosDeMedicoParaConsulta): EstadoDeConsulta => ({
  ...e,
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

/** Agrega una indicación al final: recortada, sin vacías ni repetidas (sin distinguir mayúsculas), hasta 30. */
export function agregarIndicacion(e: EstadoDeConsulta, texto: string): EstadoDeConsulta {
  const t = texto.trim();
  const repetida = e.indicaciones.some((i) => i.toLowerCase() === t.toLowerCase());
  if (!t || repetida || e.indicaciones.length >= MAXIMO_DE_INDICACIONES) return e;
  return { ...e, indicaciones: [...e.indicaciones, t] };
}

export const quitarIndicacion = (e: EstadoDeConsulta, posicion: number): EstadoDeConsulta => ({
  ...e,
  indicaciones: e.indicaciones.filter((_, n) => n !== posicion),
});

export const aEntrada = (e: EstadoDeConsulta): EntradaRegistrarConsulta => ({
  fecha: combinarFechaYHora(e.fecha, e.hora),
  especialidad: e.especialidad,
  lugar: e.lugar,
  consultorio: e.consultorio,
  medicoId: e.medicoId,
  medicoNombre: e.medicoNombre,
  medicoTelefono: e.medicoTelefono,
  medicoCedula: e.medicoCedula,
  motivo: e.motivo,
  notasDelMedico: e.notasDelMedico,
  indicaciones: e.indicaciones,
  proximaCita: e.proximaCita ?? undefined,
});

/** El formulario como texto guardable (fechas ISO). */
export const aBorrador = (e: EstadoDeConsulta): BorradorDeConsulta => ({
  fecha: e.fecha.toISOString(),
  hora: e.hora.toISOString(),
  especialidad: e.especialidad,
  lugar: e.lugar,
  consultorio: e.consultorio,
  medicoId: e.medicoId,
  medicoNombre: e.medicoNombre,
  medicoTelefono: e.medicoTelefono,
  medicoCedula: e.medicoCedula,
  motivo: e.motivo,
  notasDelMedico: e.notasDelMedico,
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
  especialidad: b.especialidad,
  lugar: b.lugar,
  consultorio: b.consultorio,
  medicoId: b.medicoId,
  medicoNombre: b.medicoNombre,
  medicoTelefono: b.medicoTelefono,
  medicoCedula: b.medicoCedula,
  motivo: b.motivo,
  notasDelMedico: b.notasDelMedico,
  indicaciones: b.indicaciones ?? [],
  proximaCita: fechaValida(b.proximaCita, null),
});

/** Abre una consulta para editarla: el médico queda "elegido" solo si está guardado en el directorio (tiene id). */
export const estadoDesdeConsulta = (c: Consulta, telefonoDelMedico?: string): EstadoDeConsulta => ({
  fecha: c.fecha,
  hora: c.fecha,
  especialidad: c.especialidad,
  lugar: c.lugar?.nombre ?? '',
  consultorio: c.consultorio ?? '',
  medicoId: c.medico?.id ? c.medico.id : undefined,
  medicoNombre: c.medico?.nombre ?? '',
  medicoTelefono: telefonoDelMedico ?? '',
  medicoCedula: '',
  motivo: c.motivo ?? '',
  notasDelMedico: c.notasDelMedico ?? '',
  indicaciones: [],
  proximaCita: c.proximaCita ?? null,
});

import { claveDeLugar, type Lugar } from '../domain/Lugar';
import { ESPECIALIDADES, type Medico } from '../domain/Medico';

export type DocumentoMedico = {
  fullName?: string;
  specialty?: string;
  phone?: string;
  licenseNumber?: string;
  notes?: string;
  deletedAt?: unknown;
};
export type DocumentoLugar = { name?: string; nameKey?: string };

export const aDocumentoMedico = (m: Medico) => ({
  fullName: m.nombreCompleto,
  specialty: m.especialidad,
  ...(m.telefono ? { phone: m.telefono } : {}),
  ...(m.cedula ? { licenseNumber: m.cedula } : {}),
  ...(m.notas ? { notes: m.notas } : {}),
  deletedAt: null,
});

export const deDocumentoMedico = (id: string, d: DocumentoMedico): Medico | null => {
  if (!d.fullName?.trim()) return null;
  const conocida = ESPECIALIDADES.some((e) => e.slug === d.specialty);
  return {
    id,
    nombreCompleto: d.fullName,
    especialidad: conocida && d.specialty ? d.specialty : 'otra',
    telefono: d.phone,
    cedula: d.licenseNumber,
    notas: d.notes,
  };
};

export const aDocumentoLugar = (l: Lugar) => ({ name: l.nombre, nameKey: claveDeLugar(l.nombre) });

export const deDocumentoLugar = (id: string, d: DocumentoLugar): Lugar | null =>
  d.name?.trim() ? { id, nombre: d.name } : null;

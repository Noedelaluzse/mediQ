import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

export const TIPOS_DE_MEDICO = [
  { valor: 'general', etiqueta: 'General' },
  { valor: 'especialista', etiqueta: 'Especialista' },
  { valor: 'dentista', etiqueta: 'Dentista' },
  { valor: 'urgencias', etiqueta: 'Urgencias' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const;

export type TipoDeMedico = (typeof TIPOS_DE_MEDICO)[number]['valor'];

/**
 * El «tipo de médico» ya no se pregunta (era casi la misma pregunta que la especialidad): se deduce de ella. Se sigue guardando
 * en Firestore como `visitType` para no migrar nada ni tocar las reglas publicadas.
 */
export function tipoDeEspecialidad(especialidad: string): TipoDeMedico {
  if (especialidad === 'medicina-general') return 'general';
  if (especialidad === 'odontologia') return 'dentista';
  if (especialidad === 'urgencias') return 'urgencias';
  if (especialidad === 'otra') return 'otro';
  return ESPECIALIDADES.some((e) => e.slug === especialidad) ? 'especialista' : 'otro';
}

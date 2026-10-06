import { describe, expect, it } from 'vitest';

import { ESPECIALIDADES } from '@/shared/kernel/especialidades';

import { TIPOS_DE_MEDICO, tipoDeEspecialidad } from './TipoDeMedico';

describe('tipoDeEspecialidad (el tipo ya no se pregunta: se deduce de la especialidad)', () => {
  it('Medicina general → general, Odontología → dentista, Urgencias → urgencias, Otra → otro', () => {
    expect(tipoDeEspecialidad('medicina-general')).toBe('general');
    expect(tipoDeEspecialidad('odontologia')).toBe('dentista');
    expect(tipoDeEspecialidad('urgencias')).toBe('urgencias');
    expect(tipoDeEspecialidad('otra')).toBe('otro');
  });

  it('cualquier otra especialidad es especialista', () => {
    for (const slug of ['cardiologia', 'dermatologia', 'ginecologia', 'medicina-interna', 'oftalmologia', 'pediatria', 'traumatologia']) {
      expect(tipoDeEspecialidad(slug)).toBe('especialista');
    }
  });

  it('todas las especialidades del catálogo dan un tipo válido para las reglas de Firestore', () => {
    const validos = TIPOS_DE_MEDICO.map((t) => t.valor);
    for (const e of ESPECIALIDADES) expect(validos).toContain(tipoDeEspecialidad(e.slug));
  });

  it('una especialidad desconocida cae en «otro»', () => {
    expect(tipoDeEspecialidad('inventada')).toBe('otro');
  });
});

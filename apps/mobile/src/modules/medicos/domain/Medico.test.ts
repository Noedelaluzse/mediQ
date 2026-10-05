import { describe, expect, it } from 'vitest';

import { ESPECIALIDADES, crearMedico, nombreDeEspecialidad } from './Medico';

describe('crearMedico (RF-20)', () => {
  const base = { id: 'm1', nombre: 'Dra. Mariana Solís', especialidad: 'cardiologia' };

  it('crea un médico con solo nombre y especialidad', () => {
    const r = crearMedico(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nombreCompleto).toBe('Dra. Mariana Solís');
      expect(r.value.especialidad).toBe('cardiologia');
    }
  });

  it('el nombre es obligatorio', () => {
    expect(crearMedico({ ...base, nombre: '' }).ok).toBe(false);
    expect(crearMedico({ ...base, nombre: '    ' }).ok).toBe(false);
  });

  it('recorta espacios y deja vacíos los datos opcionales que vienen en blanco', () => {
    const r = crearMedico({ ...base, nombre: '  Dr. Pech  ', telefono: '  ', cedula: '', notas: '   ' });
    expect(r.ok && r.value).toMatchObject({ nombreCompleto: 'Dr. Pech', telefono: undefined, cedula: undefined, notas: undefined });
  });

  it('conserva teléfono, cédula y notas con valor', () => {
    const r = crearMedico({ ...base, telefono: ' 998 555 0142 ', cedula: '123', notas: 'Atiende lunes' });
    expect(r.ok && r.value).toMatchObject({ telefono: '998 555 0142', cedula: '123', notas: 'Atiende lunes' });
  });

  it('rechaza una especialidad que no está en el catálogo', () => {
    expect(crearMedico({ ...base, especialidad: 'inventada' }).ok).toBe(false);
  });

  it('el médico no tiene lugar ni consultorio: un médico puede atender en varios lugares', () => {
    const r = crearMedico(base);
    expect(r.ok && Object.keys(r.value)).not.toContain('lugar');
    expect(r.ok && Object.keys(r.value)).not.toContain('consultorio');
  });
});

describe('catálogo de especialidades (las del diseño)', () => {
  it('incluye las 10 opciones del diseño, con "Otra" al final', () => {
    expect(ESPECIALIDADES.map((e) => e.nombre)).toEqual([
      'Cardiología',
      'Dermatología',
      'Ginecología',
      'Medicina general',
      'Medicina interna',
      'Odontología',
      'Oftalmología',
      'Pediatría',
      'Traumatología',
      'Otra',
    ]);
  });

  it('traduce el slug al nombre y tolera uno desconocido', () => {
    expect(nombreDeEspecialidad('odontologia')).toBe('Odontología');
    expect(nombreDeEspecialidad('desconocida')).toBe('Otra');
  });
});

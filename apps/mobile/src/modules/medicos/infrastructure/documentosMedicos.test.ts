import { describe, expect, it } from 'vitest';

import { claveDeLugar } from '../domain/Lugar';
import { aDocumentoLugar, aDocumentoMedico, deDocumentoLugar, deDocumentoMedico } from './documentosMedicos';

describe('documento de médico', () => {
  it('traduce al formato de Firestore sin campos vacíos y con deletedAt nulo', () => {
    expect(aDocumentoMedico({ id: 'm1', nombreCompleto: 'Dra. Solís', especialidad: 'cardiologia' })).toEqual({
      fullName: 'Dra. Solís',
      specialty: 'cardiologia',
      deletedAt: null,
    });
  });

  it('incluye teléfono, cédula y notas cuando existen', () => {
    const d = aDocumentoMedico({
      id: 'm1',
      nombreCompleto: 'Dra. Solís',
      especialidad: 'cardiologia',
      telefono: '998',
      cedula: '123',
      notas: 'lunes',
    });
    expect(d).toMatchObject({ phone: '998', licenseNumber: '123', notes: 'lunes' });
  });

  it('ida y vuelta conserva el médico', () => {
    const m = { id: 'm1', nombreCompleto: 'Dr. Pech', especialidad: 'pediatria', telefono: '1', cedula: '2', notas: '3' };
    expect(deDocumentoMedico('m1', aDocumentoMedico(m))).toEqual(m);
  });

  it('un documento sin especialidad cae en "otra"', () => {
    expect(deDocumentoMedico('m1', { fullName: 'X' })?.especialidad).toBe('otra');
  });

  it('un documento sin nombre se descarta', () => {
    expect(deDocumentoMedico('m1', { specialty: 'pediatria' })).toBeNull();
  });
});

describe('documento de lugar', () => {
  it('guarda el nombre y su clave de unicidad', () => {
    expect(aDocumentoLugar({ id: 'l1', nombre: 'Clínica del Sureste' })).toEqual({
      name: 'Clínica del Sureste',
      nameKey: claveDeLugar('Clínica del Sureste'),
    });
  });

  it('ida y vuelta conserva el lugar', () => {
    const l = { id: 'l1', nombre: 'Hospital Morelos' };
    expect(deDocumentoLugar('l1', aDocumentoLugar(l))).toEqual(l);
  });

  it('un documento sin nombre se descarta', () => {
    expect(deDocumentoLugar('l1', {})).toBeNull();
  });
});

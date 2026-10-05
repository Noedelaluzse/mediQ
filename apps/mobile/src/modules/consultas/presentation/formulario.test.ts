import { describe, expect, it } from 'vitest';

import {
  aEntrada,
  aplicarMedicoElegido,
  cambiarTipo,
  combinarFechaYHora,
  editarNombreDelMedico,
  estadoInicial,
} from './formulario';

const ahora = new Date(2026, 9, 5, 9, 30, 45);

describe('estadoInicial', () => {
  it('abre con la fecha y hora actuales, tipo General y Medicina general', () => {
    const e = estadoInicial(ahora);
    expect(e).toMatchObject({ fecha: ahora, hora: ahora, tipo: 'general', especialidad: 'medicina-general', proximaCita: null });
    expect(e.lugar).toBe('');
    expect(e.medicoId).toBeUndefined();
  });
});

describe('combinarFechaYHora', () => {
  it('toma día de la fecha y hora:minutos de la hora, con segundos en cero', () => {
    const r = combinarFechaYHora(new Date(2026, 8, 28, 23, 59), new Date(2020, 0, 1, 10, 30, 15));
    expect(r).toEqual(new Date(2026, 8, 28, 10, 30, 0));
  });
});

describe('cambiarTipo', () => {
  it('Dentista pone Odontología y General pone Medicina general', () => {
    expect(cambiarTipo(estadoInicial(ahora), 'dentista').especialidad).toBe('odontologia');
    expect(cambiarTipo({ ...estadoInicial(ahora), especialidad: 'cardiologia' }, 'general').especialidad).toBe('medicina-general');
  });

  it('Especialista, Urgencias y Otro no cambian la especialidad elegida', () => {
    const e = { ...estadoInicial(ahora), especialidad: 'cardiologia' };
    expect(cambiarTipo(e, 'especialista')).toMatchObject({ tipo: 'especialista', especialidad: 'cardiologia' });
    expect(cambiarTipo(e, 'urgencias').especialidad).toBe('cardiologia');
  });
});

describe('aplicarMedicoElegido (HU-08: Elegir guardado llena nombre, lugar, teléfono y especialidad)', () => {
  const datos = { medicoId: 'm1', nombre: 'Dra. Mariana Solís', especialidad: 'cardiologia', telefono: '998', cedula: '123', lugar: 'Clínica del Sureste' };

  it('rellena los datos del médico, su especialidad y el lugar si estaba vacío', () => {
    const e = aplicarMedicoElegido(estadoInicial(ahora), datos);
    expect(e).toMatchObject({ medicoId: 'm1', medicoNombre: 'Dra. Mariana Solís', especialidad: 'cardiologia', medicoTelefono: '998', medicoCedula: '123', lugar: 'Clínica del Sureste' });
  });

  it('ajusta el tipo de médico a la especialidad del elegido', () => {
    expect(aplicarMedicoElegido(estadoInicial(ahora), datos).tipo).toBe('especialista');
    expect(aplicarMedicoElegido(estadoInicial(ahora), { ...datos, especialidad: 'odontologia' }).tipo).toBe('dentista');
    expect(aplicarMedicoElegido({ ...estadoInicial(ahora), tipo: 'especialista' }, { ...datos, especialidad: 'medicina-general' }).tipo).toBe('general');
  });

  it('respeta Urgencias u Otro si ya estaban elegidos y el médico es especialista', () => {
    expect(aplicarMedicoElegido({ ...estadoInicial(ahora), tipo: 'urgencias' }, datos).tipo).toBe('urgencias');
  });

  it('no pisa un lugar que el paciente ya escribió', () => {
    const e = aplicarMedicoElegido({ ...estadoInicial(ahora), lugar: 'Hospital Morelos' }, datos);
    expect(e.lugar).toBe('Hospital Morelos');
  });

  it('al elegir sin teléfono ni cédula los deja vacíos', () => {
    const e = aplicarMedicoElegido({ ...estadoInicial(ahora), medicoTelefono: 'viejo' }, { medicoId: 'm2', nombre: 'Dr. Pech', especialidad: 'medicina-general' });
    expect(e).toMatchObject({ medicoTelefono: '', medicoCedula: '' });
  });
});

describe('editarNombreDelMedico', () => {
  it('si cambias el nombre de un médico elegido, deja de ser ese médico', () => {
    const e = editarNombreDelMedico({ ...estadoInicial(ahora), medicoId: 'm1', medicoNombre: 'Dra. Solís' }, 'Dra. Solís Pérez');
    expect(e).toMatchObject({ medicoId: undefined, medicoNombre: 'Dra. Solís Pérez' });
  });

  it('si el nombre queda igual, sigue siendo el mismo médico', () => {
    const e = editarNombreDelMedico({ ...estadoInicial(ahora), medicoId: 'm1', medicoNombre: 'Dra. Solís' }, 'Dra. Solís');
    expect(e.medicoId).toBe('m1');
  });
});

describe('aEntrada', () => {
  it('convierte el formulario en la entrada del caso de uso', () => {
    const e = {
      ...estadoInicial(ahora),
      fecha: new Date(2026, 8, 28),
      hora: new Date(2000, 0, 1, 10, 30),
      tipo: 'especialista',
      especialidad: 'cardiologia',
      lugar: 'Clínica',
      consultorio: '204',
      medicoId: 'm1',
      medicoNombre: 'Dra. Solís',
      medicoTelefono: '998',
      medicoCedula: '',
      motivo: 'Revisión',
      indicaciones: 'Bajar la sal',
      proximaCita: new Date(2026, 9, 19, 10, 30),
    };
    expect(aEntrada(e)).toEqual({
      fecha: new Date(2026, 8, 28, 10, 30),
      tipo: 'especialista',
      especialidad: 'cardiologia',
      lugar: 'Clínica',
      consultorio: '204',
      medicoId: 'm1',
      medicoNombre: 'Dra. Solís',
      medicoTelefono: '998',
      medicoCedula: '',
      motivo: 'Revisión',
      indicaciones: 'Bajar la sal',
      proximaCita: new Date(2026, 9, 19, 10, 30),
    });
  });

  it('sin próxima cita la entrada no la lleva', () => {
    expect(aEntrada(estadoInicial(ahora)).proximaCita).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import {
  agregarIndicacion,
  aBorrador,
  aEntrada,
  aplicarMedicoElegido,
  cambiarTipo,
  combinarFechaYHora,
  deBorrador,
  editarNombreDelMedico,
  estadoDesdeConsulta,
  quitarIndicacion,
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
      notasDelMedico: 'Bajar la sal',
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
      notasDelMedico: 'Bajar la sal',
      indicaciones: [],
      proximaCita: new Date(2026, 9, 19, 10, 30),
    });
  });

  it('sin próxima cita la entrada no la lleva', () => {
    expect(aEntrada(estadoInicial(ahora)).proximaCita).toBeUndefined();
  });
});

describe('borrador (RF-14): del formulario al texto guardado y de vuelta', () => {
  const completo = {
    ...estadoInicial(ahora),
    fecha: new Date(2026, 8, 28, 0, 0),
    hora: new Date(2026, 8, 28, 10, 30),
    tipo: 'especialista',
    especialidad: 'cardiologia',
    lugar: 'Clínica',
    consultorio: '204',
    medicoId: 'm1',
    medicoNombre: 'Dra. Solís',
    medicoTelefono: '998',
    medicoCedula: '123',
    motivo: 'Revisión',
    notasDelMedico: 'Bajar la sal',
    indicaciones: ['Medir la presión', 'Análisis en ayunas'],
    proximaCita: new Date(2026, 9, 19, 10, 30),
  };

  it('ida y vuelta conserva todo, incluidas las fechas y el médico elegido', () => {
    expect(deBorrador(aBorrador(completo), ahora)).toEqual(completo);
  });

  it('el borrador guarda las fechas como texto ISO', () => {
    const b = aBorrador(completo);
    expect(b.fecha).toBe(completo.fecha.toISOString());
    expect(b.proximaCita).toBe(completo.proximaCita.toISOString());
  });

  it('sin próxima cita ni médico elegido se conservan como tales', () => {
    const r = deBorrador(aBorrador(estadoInicial(ahora)), ahora);
    expect(r.proximaCita).toBeNull();
    expect(r.medicoId).toBeUndefined();
  });

  it('una fecha dañada en el borrador cae en el momento actual', () => {
    const r = deBorrador({ ...aBorrador(estadoInicial(ahora)), fecha: 'basura', hora: 'basura', proximaCita: 'basura' }, ahora);
    expect(r.fecha).toEqual(ahora);
    expect(r.hora).toEqual(ahora);
    expect(r.proximaCita).toBeNull();
  });
});

describe('indicaciones del formulario (RF-15)', () => {
  it('el formulario empieza sin indicaciones', () => {
    expect(estadoInicial(ahora).indicaciones).toEqual([]);
  });

  it('agregar recorta el texto y la deja al final', () => {
    const e = agregarIndicacion(agregarIndicacion(estadoInicial(ahora), '  Medir la presión '), 'Análisis');
    expect(e.indicaciones).toEqual(['Medir la presión', 'Análisis']);
  });

  it('un texto vacío o repetido (sin importar mayúsculas) no se agrega', () => {
    const base = agregarIndicacion(estadoInicial(ahora), 'Medir la presión');
    expect(agregarIndicacion(base, '   ').indicaciones).toEqual(['Medir la presión']);
    expect(agregarIndicacion(base, 'medir LA presión').indicaciones).toEqual(['Medir la presión']);
  });

  it('no pasa de 30', () => {
    let e = estadoInicial(ahora);
    for (let n = 0; n < 35; n++) e = agregarIndicacion(e, `indicación ${n}`);
    expect(e.indicaciones).toHaveLength(30);
  });

  it('quitar saca la de esa posición', () => {
    const e = quitarIndicacion({ ...estadoInicial(ahora), indicaciones: ['a', 'b', 'c'] }, 1);
    expect(e.indicaciones).toEqual(['a', 'c']);
  });

  it('aEntrada lleva las indicaciones', () => {
    expect(aEntrada({ ...estadoInicial(ahora), indicaciones: ['a', 'b'] }).indicaciones).toEqual(['a', 'b']);
  });

  it('un borrador viejo sin la lista se restaura con lista vacía', () => {
    const { indicaciones: _quitada, ...viejo } = aBorrador(estadoInicial(ahora));
    expect(deBorrador(viejo as ReturnType<typeof aBorrador>, ahora).indicaciones).toEqual([]);
  });
});

describe('estadoDesdeConsulta (abrir una consulta para editarla)', () => {
  const consulta = {
    id: 'c1',
    pacienteId: 'self',
    modo: 'presencial' as const,
    tipo: 'especialista' as const,
    especialidad: 'cardiologia',
    fecha: new Date(2026, 8, 28, 10, 30),
    medico: { id: 'm1', nombre: 'Dra. Solís' },
    lugar: { id: 'l1', nombre: 'Clínica' },
    consultorio: '204',
    motivo: 'Revisión',
    notasDelMedico: 'Bajar la sal',
    indicaciones: [],
    proximaCita: new Date(2026, 9, 19, 10, 30),
  };

  it('rellena el formulario con la consulta, el médico elegido y su teléfono', () => {
    const e = estadoDesdeConsulta(consulta, '998 555 0142');
    expect(e).toMatchObject({
      fecha: consulta.fecha,
      hora: consulta.fecha,
      tipo: 'especialista',
      especialidad: 'cardiologia',
      lugar: 'Clínica',
      consultorio: '204',
      medicoId: 'm1',
      medicoNombre: 'Dra. Solís',
      medicoTelefono: '998 555 0142',
      motivo: 'Revisión',
      notasDelMedico: 'Bajar la sal',
      proximaCita: consulta.proximaCita,
    });
  });

  it('sin médico, lugar ni próxima cita deja los campos vacíos', () => {
    const e = estadoDesdeConsulta({ ...consulta, medico: undefined, lugar: undefined, consultorio: undefined, motivo: undefined, notasDelMedico: undefined, proximaCita: undefined });
    expect(e).toMatchObject({ lugar: '', consultorio: '', medicoId: undefined, medicoNombre: '', medicoTelefono: '', motivo: '', notasDelMedico: '', proximaCita: null });
  });

  it('un médico sin id guardado se edita como nuevo', () => {
    expect(estadoDesdeConsulta({ ...consulta, medico: { id: '', nombre: 'Dr. Pech' } }).medicoId).toBeUndefined();
  });
});

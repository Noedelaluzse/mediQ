import { describe, expect, it } from 'vitest';

import {
  agregarFila,
  aEntradas,
  conPrimeraToma,
  conRecordatorio,
  horaADate,
  dateAHora,
  recordatorioDisponible,
  cambiarCampo,
  conCantidad,
  conDuracionMovida,
  conFrecuencia,
  conUnidadDeDosis,
  conUnidadDeDuracion,
  conVia,
  dosisElegida,
  duracionElegida,
  DEFECTOS,
  enFila,
  escribirDosisAMano,
  esFilaSinTocar,
  estadoDesdeReceta,
  filaNueva,
  quitarFila,
  resumenDelMedicamento,
  volverALaListaDeDosis,
  volverALaListaDeDuracion,
} from './receta';

describe('una fila nueva', () => {
  it('trae los valores comunes ya elegidos y nada escrito', () => {
    expect(filaNueva()).toEqual({
      id: null,
      nombre: '',
      dosis: '1 tableta',
      via: 'Oral',
      frecuencia: 'Cada 8 horas',
      duracion: '7 días',
      indicaciones: '',
      viaOtra: false,
      frecuenciaOtra: false,
      dosisManual: false,
      duracionManual: false,
      recordar: false,
      primeraToma: '08:00',
      recordarDesde: null,
    });
    expect(DEFECTOS).toEqual({ dosis: '1 tableta', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días' });
  });

  it('sin tocar no cuenta como medicamento; con nombre o con algo cambiado, sí', () => {
    expect(esFilaSinTocar(filaNueva())).toBe(true);
    expect(esFilaSinTocar({ ...filaNueva(), nombre: '  ' })).toBe(true);
    expect(esFilaSinTocar({ ...filaNueva(), nombre: 'Losartán' })).toBe(false);
    expect(esFilaSinTocar({ ...filaNueva(), via: 'Tópica' })).toBe(false);
    expect(esFilaSinTocar({ ...filaNueva(), indicaciones: 'Con agua' })).toBe(false);
    expect(esFilaSinTocar({ ...filaNueva(), recordar: true })).toBe(false);
  });
});

describe('formulario de la receta', () => {
  it('sin receta empieza con una fila nueva', () => {
    expect(estadoDesdeReceta([])).toEqual([filaNueva()]);
  });

  it('carga lo guardado tal cual: lo que faltaba sigue vacío (no se inventan valores)', () => {
    const [f] = estadoDesdeReceta([{ nombre: 'Losartán', via: 'Oral' }]);
    expect(f).toMatchObject({ nombre: 'Losartán', via: 'Oral', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
    expect(f.viaOtra || f.frecuenciaOtra || f.dosisManual || f.duracionManual).toBe(false);
  });

  it('un texto guardado antes de las listas se conserva y se edita a mano («Otra…» o texto)', () => {
    const [f] = estadoDesdeReceta([{ nombre: 'Losartán', dosis: '50 mg', via: 'oral', frecuencia: 'c/8 hrs', duracion: 'una semana' }]);
    expect(f).toMatchObject({ dosis: '50 mg', via: 'oral', frecuencia: 'c/8 hrs', duracion: 'una semana' });
    expect(f).toMatchObject({ dosisManual: true, viaOtra: true, frecuenciaOtra: true, duracionManual: true });
  });

  it('lo que sí está en el catálogo se carga como elegido', () => {
    const [f] = estadoDesdeReceta([{ nombre: 'A', dosis: '2 tabletas', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '1 mes' }]);
    expect(f).toMatchObject({ dosisManual: false, viaOtra: false, frecuenciaOtra: false, duracionManual: false });
  });

  it('agrega, cambia y quita filas sin mutar la lista original', () => {
    const una = [filaNueva()];
    const dos = agregarFila(una);
    expect(una).toHaveLength(1);
    expect(dos).toHaveLength(2);
    expect(cambiarCampo(dos, 1, 'nombre', 'Aspirina')[1].nombre).toBe('Aspirina');
    expect(dos[1].nombre).toBe('');
    expect(quitarFila(dos, 0)).toHaveLength(1);
  });

  it('quitar la única fila deja una fila nueva', () => {
    expect(quitarFila([{ ...filaNueva(), nombre: 'X' }], 0)).toEqual([filaNueva()]);
  });

  it('enFila aplica un cambio solo a esa fila', () => {
    const filas = [filaNueva(), filaNueva()];
    const r = enFila(filas, 1, (f) => conVia(f, 'Nasal'));
    expect(r[0].via).toBe('Oral');
    expect(r[1].via).toBe('Nasal');
  });
});

describe('aEntradas (lo que se guarda)', () => {
  it('descarta las filas sin tocar y quita las marcas internas', () => {
    const filas = [{ ...filaNueva(), nombre: 'Losartán' }, filaNueva()];
    expect(aEntradas(filas)).toEqual([{ nombre: 'Losartán', dosis: '1 tableta', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días', indicaciones: '', recordar: false }]);
  });

  it('una fila sin nombre pero con algo cambiado llega al caso de uso (que la rechaza)', () => {
    const r = aEntradas([{ ...filaNueva(), via: 'Nasal' }]);
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe('');
  });

  it('una fila cargada con campos vacíos se guarda igual de vacía (sin inventar valores)', () => {
    const filas = estadoDesdeReceta([{ nombre: 'Losartán' }]);
    expect(aEntradas(filas)).toEqual([{ nombre: 'Losartán', dosis: '', via: '', frecuencia: '', duracion: '', indicaciones: '', recordar: false }]);
  });
});

describe('dosis: cantidad y unidad', () => {
  it('elegir cantidad o unidad compone el texto con singular y plural', () => {
    const f = filaNueva();
    expect(conCantidad(f, '2').dosis).toBe('2 tabletas');
    expect(conCantidad(f, '½').dosis).toBe('½ tableta');
    expect(conUnidadDeDosis(f, 'gota').dosis).toBe('1 gota');
    expect(conUnidadDeDosis(conCantidad(f, '3'), 'gota').dosis).toBe('3 gotas');
  });

  it('con la dosis vacía, elegir una cantidad usa «tableta» y elegir una unidad usa «1»', () => {
    const vacia = { ...filaNueva(), dosis: '' };
    expect(conCantidad(vacia, '2').dosis).toBe('2 tabletas');
    expect(conUnidadDeDosis(vacia, 'ml').dosis).toBe('1 ml');
  });

  it('dosisElegida lee lo que hay: vacío o a mano no tiene nada elegido', () => {
    expect(dosisElegida(filaNueva())).toEqual({ cantidad: '1', unidad: 'tableta' });
    expect(dosisElegida({ ...filaNueva(), dosis: '' })).toEqual({ cantidad: null, unidad: null });
    expect(dosisElegida({ ...filaNueva(), dosis: '50 mg', dosisManual: true })).toEqual({ cantidad: null, unidad: null });
  });

  it('una dosis antigua escrita a mano se edita como texto y se puede volver a la lista', () => {
    const f = { ...filaNueva(), dosis: '50 mg', dosisManual: true };
    expect(escribirDosisAMano(f, '50 mg cada uno').dosis).toBe('50 mg cada uno');
    const lista = volverALaListaDeDosis(f);
    expect(lista).toMatchObject({ dosis: DEFECTOS.dosis, dosisManual: false });
  });
});

describe('vía y frecuencia: lista con «Otra…»', () => {
  it('elegir del catálogo guarda ese texto', () => {
    expect(conVia(filaNueva(), 'Tópica')).toMatchObject({ via: 'Tópica', viaOtra: false });
    expect(conFrecuencia(filaNueva(), '2 veces al día')).toMatchObject({ frecuencia: '2 veces al día', frecuenciaOtra: false });
  });

  it('«Otra…» deja el campo de texto vacío y listo para escribir', () => {
    expect(conVia(filaNueva(), 'Otra…')).toMatchObject({ via: '', viaOtra: true });
    expect(conFrecuencia(filaNueva(), 'Otra…')).toMatchObject({ frecuencia: '', frecuenciaOtra: true });
  });

  it('escribir a mano y luego elegir de la lista vuelve al modo lista', () => {
    const escrita = { ...conVia(filaNueva(), 'Otra…'), via: 'Intraarticular' };
    expect(conVia(escrita, 'Oral')).toMatchObject({ via: 'Oral', viaOtra: false });
  });
});

describe('duración: número y unidad', () => {
  it('mover suma o resta de 1 en 1, sin bajar de 1 ni pasar el límite de la unidad', () => {
    const f = filaNueva();
    expect(conDuracionMovida(f, 1).duracion).toBe('8 días');
    expect(conDuracionMovida(f, -1).duracion).toBe('6 días');
    expect(conDuracionMovida({ ...f, duracion: '1 día' }, -1).duracion).toBe('1 día');
    expect(conDuracionMovida({ ...f, duracion: '365 días' }, 1).duracion).toBe('365 días');
    expect(conDuracionMovida({ ...f, duracion: '24 meses' }, 1).duracion).toBe('24 meses');
  });

  it('cambiar de unidad conserva el número y respeta el límite de la nueva unidad', () => {
    const f = filaNueva();
    expect(conUnidadDeDuracion(f, 'semanas').duracion).toBe('7 semanas');
    expect(conUnidadDeDuracion({ ...f, duracion: '100 días' }, 'meses').duracion).toBe('24 meses');
    expect(conUnidadDeDuracion({ ...f, duracion: '1 día' }, 'meses').duracion).toBe('1 mes');
  });

  it('con la duración vacía, «+» empieza en 1 día y elegir una unidad empieza en 1', () => {
    const vacia = { ...filaNueva(), duracion: '' };
    expect(conDuracionMovida(vacia, 1).duracion).toBe('1 día');
    expect(conDuracionMovida(vacia, -1).duracion).toBe('');
    expect(conUnidadDeDuracion(vacia, 'semanas').duracion).toBe('1 semana');
  });

  it('duracionElegida lee lo que hay', () => {
    expect(duracionElegida(filaNueva())).toEqual({ cantidad: 7, unidad: 'dias' });
    expect(duracionElegida({ ...filaNueva(), duracion: '' })).toEqual({ cantidad: null, unidad: null });
  });

  it('una duración antigua escrita a mano se conserva y se puede volver a la lista', () => {
    const f = { ...filaNueva(), duracion: 'una semana', duracionManual: true };
    expect(volverALaListaDeDuracion(f)).toMatchObject({ duracion: DEFECTOS.duracion, duracionManual: false });
  });
});

describe('resumenDelMedicamento', () => {
  it('une dosis, frecuencia, duración y vía con puntos medios', () => {
    expect(resumenDelMedicamento({ nombre: 'Losartán', dosis: '50 mg', frecuencia: 'cada 24 h', duracion: '30 días', via: 'Oral' })).toBe('50 mg · cada 24 h · 30 días · Oral');
  });
  it('omite lo que falta y queda vacío si no hay nada', () => {
    expect(resumenDelMedicamento({ nombre: 'A', dosis: '5 ml', via: 'Oral' })).toBe('5 ml · Oral');
    expect(resumenDelMedicamento({ nombre: 'A' })).toBe('');
  });
});

describe('recordatorio de toma en el formulario (RF-32)', () => {
  it('disponible con una frecuencia y duración del catálogo: da el resumen de avisos', () => {
    expect(recordatorioDisponible(filaNueva())).toEqual({ disponible: true, resumen: 'Te avisaremos a las 8:00, 16:00 y 0:00 durante 7 días' });
  });

  it('no disponible con «Solo si hay dolor o fiebre», con texto libre o con una duración escrita a mano, y dice por qué', () => {
    const sinFrecuencia = recordatorioDisponible({ ...filaNueva(), frecuencia: 'Solo si hay dolor o fiebre' });
    expect(sinFrecuencia.disponible).toBe(false);
    expect(!sinFrecuencia.disponible && sinFrecuencia.motivo).toContain('frecuencia');
    expect(recordatorioDisponible({ ...filaNueva(), frecuencia: 'c/8 hrs', frecuenciaOtra: true }).disponible).toBe(false);
    const sinDuracion = recordatorioDisponible({ ...filaNueva(), duracion: 'una semana', duracionManual: true });
    expect(!sinDuracion.disponible && sinDuracion.motivo).toContain('duración');
    expect(recordatorioDisponible({ ...filaNueva(), duracion: '' }).disponible).toBe(false);
  });

  it('activar y elegir la hora de la primera toma', () => {
    const f = conPrimeraToma(conRecordatorio(filaNueva(), true), '07:30');
    expect(f).toMatchObject({ recordar: true, primeraToma: '07:30' });
    expect(recordatorioDisponible(f)).toEqual({ disponible: true, resumen: 'Te avisaremos a las 7:30, 15:30 y 23:30 durante 7 días' });
    expect(conRecordatorio(f, false).recordar).toBe(false);
  });

  it('se guarda con aviso solo si está activado Y se puede calcular; si no, sin aviso (nunca da error por esto)', () => {
    const activa = { ...filaNueva(), nombre: 'Losartán', recordar: true, primeraToma: '09:00' };
    expect(aEntradas([activa])[0]).toMatchObject({ recordar: true, primeraToma: '09:00' });
    const imposible = { ...activa, frecuencia: 'Solo si hay dolor o fiebre' };
    expect(aEntradas([imposible])[0]).toMatchObject({ recordar: false });
    expect(aEntradas([imposible])[0].primeraToma).toBeUndefined();
  });

  it('al editar, el aviso guardado se carga activado, con su hora y su inicio', () => {
    const desde = new Date(2026, 9, 6, 14, 0);
    const [f] = estadoDesdeReceta([{ nombre: 'Losartán', dosis: '1 tableta', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días', recordar: true, primeraToma: '21:00', recordarDesde: desde }]);
    expect(f).toMatchObject({ recordar: true, primeraToma: '21:00', recordarDesde: desde });
    expect(aEntradas([f])[0]).toMatchObject({ recordar: true, primeraToma: '21:00', recordarDesde: desde });
  });

  it('una receta sin aviso se carga desactivada, con 08:00 como hora sugerida', () => {
    const [f] = estadoDesdeReceta([{ nombre: 'Losartán' }]);
    expect(f).toMatchObject({ recordar: false, primeraToma: '08:00', recordarDesde: null });
  });

  it('convierte entre «HH:mm» y la hora del selector', () => {
    const d = horaADate('07:30', new Date(2026, 9, 6, 12, 0));
    expect([d.getHours(), d.getMinutes()]).toEqual([7, 30]);
    expect(dateAHora(new Date(2026, 9, 6, 7, 5))).toBe('07:05');
    expect(dateAHora(new Date(2026, 9, 6, 0, 0))).toBe('00:00');
  });
});

describe('identidad del medicamento en el formulario (AUD-01 / F062)', () => {
  const guardado = { id: 'mA', nombre: 'Losartán', dosis: '50 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días' };

  it('una fila nueva no tiene id (se le asigna al guardar)', () => {
    expect(filaNueva().id).toBeNull();
  });

  it('al abrir una receta guardada, cada fila conserva el id de su medicamento', () => {
    expect(estadoDesdeReceta([guardado, { ...guardado, id: 'mB', nombre: 'Aspirina' }]).map((f) => f.id)).toEqual(['mA', 'mB']);
    expect(estadoDesdeReceta([{ nombre: 'Sin id' }])[0].id).toBeNull();
  });

  it('al guardar, el id viaja con la fila y las filas nuevas viajan sin id', () => {
    const filas = [...estadoDesdeReceta([guardado]), { ...filaNueva(), nombre: 'Nuevo' }];
    const entradas = aEntradas(filas);
    expect(entradas[0].id).toBe('mA');
    expect(entradas[1].id).toBeUndefined();
  });

  it('quitar o editar otra fila no cambia el id de las demás', () => {
    const filas = estadoDesdeReceta([guardado, { ...guardado, id: 'mB', nombre: 'Aspirina' }, { ...guardado, id: 'mC', nombre: 'Omeprazol' }]);
    expect(quitarFila(filas, 0).map((f) => f.id)).toEqual(['mB', 'mC']);
    expect(cambiarCampo(filas, 1, 'nombre', 'Otra').map((f) => f.id)).toEqual(['mA', 'mB', 'mC']);
  });
});


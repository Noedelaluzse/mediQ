import { describe, expect, it } from 'vitest';

import type { Consulta } from '../domain/Consulta';
import type { Medicamento } from '../domain/Receta';
import { detalleATexto, detalleDeTexto, recetaATexto, recetaDeTexto } from './copiaDeDetalle';
import type { DetalleDeConsulta } from './ObtenerDetalleDeConsulta';

const consulta: Consulta = {
  id: 'c1',
  pacienteId: 'self',
  modo: 'presencial',
  tipo: 'especialista',
  especialidad: 'cardiologia',
  fecha: new Date(2026, 9, 4, 9, 30),
  medico: { id: 'm1', nombre: 'Dra. Solís' },
  lugar: { id: 'l1', nombre: 'Clínica del Sureste' },
  consultorio: '204',
  motivo: 'Revisión',
  notasDelMedico: 'Bajar la sal',
  indicaciones: [
    { id: 'i1', texto: 'Medir la presión', orden: 0, hechaEn: new Date(2026, 9, 5, 8, 0) },
    { id: 'i2', texto: 'Reposo', orden: 1 },
  ],
  proximaCita: new Date(2026, 10, 15, 11, 0),
};
const detalle: DetalleDeConsulta = { consulta, indicaciones: consulta.indicaciones, telefonoDelMedico: '998 555 0142' };

describe('copia del detalle (las fechas viajan como texto y vuelven como fechas)', () => {
  it('ida y vuelta sin perder nada: consulta, indicaciones con su hora de hecha y teléfono', () => {
    expect(detalleDeTexto(detalleATexto(detalle))).toEqual({ detalle });
  });

  it('una consulta mínima (sin médico, lugar, notas, próxima cita ni teléfono) también', () => {
    const minima: Consulta = { id: 'c2', pacienteId: 'self', modo: 'presencial', tipo: 'general', especialidad: 'medicina-general', fecha: new Date(2026, 8, 1, 8, 0), indicaciones: [] };
    const d: DetalleDeConsulta = { consulta: minima, indicaciones: [] };
    expect(detalleDeTexto(detalleATexto(d))).toEqual({ detalle: d });
  });

  it('«la consulta ya no existe» (null) se copia como tal', () => {
    expect(detalleDeTexto(detalleATexto(null))).toEqual({ detalle: null });
  });

  it('un texto dañado o sin forma devuelve null (cuenta como sin copia)', () => {
    for (const malo of ['', '{no es json', '[]', '{"a":1}', '{"detalle":{"consulta":{"id":"x"}}}', JSON.stringify({ detalle: { consulta: { id: 'x', fecha: 'no es fecha' }, indicaciones: [] } })]) {
      expect(detalleDeTexto(malo), malo).toBeNull();
    }
  });

  it('una indicación dañada se descarta y las buenas se conservan', () => {
    const texto = JSON.parse(detalleATexto(detalle));
    texto.detalle.indicaciones.push({ id: 5 }, { id: 'x', texto: 'ok', orden: 'no' });
    texto.detalle.consulta.indicaciones = texto.detalle.indicaciones;
    const r = detalleDeTexto(JSON.stringify(texto));
    expect(r?.detalle?.indicaciones.map((i) => i.id)).toEqual(['i1', 'i2']);
  });
});

const receta: Medicamento[] = [
  { nombre: 'Losartán', dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '7 días', via: 'Oral', indicaciones: 'Con agua', recordar: true, primeraToma: '08:00', recordarDesde: new Date(2026, 9, 5, 7, 0) },
  { nombre: 'Aspirina' },
];

describe('copia de la receta', () => {
  it('ida y vuelta, con la fecha de activación del aviso', () => {
    expect(recetaDeTexto(recetaATexto(receta))).toEqual(receta);
  });

  it('una receta vacía se copia como vacía (no como «sin copia»)', () => {
    expect(recetaDeTexto(recetaATexto([]))).toEqual([]);
  });

  it('dañada, null; un medicamento sin nombre se descarta', () => {
    expect(recetaDeTexto('basura')).toBeNull();
    expect(recetaDeTexto('{"a":1}')).toBeNull();
    expect(recetaDeTexto(JSON.stringify([{ nombre: 'A' }, { dosis: 'x' }, 7]))).toEqual([{ nombre: 'A' }]);
  });
});

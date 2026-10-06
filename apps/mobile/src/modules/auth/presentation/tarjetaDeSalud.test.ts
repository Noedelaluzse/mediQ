import { describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { avisoDeSalud, botonDeSalud, filasDeSalud } from './tarjetaDeSalud';

const hoy = new Date(2026, 9, 6);
const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'hombre',
  tipoDeSangre: 'O+',
  alergias: { sinConocidas: false, items: ['Polen', 'Mariscos'] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe('filasDeSalud (lo que muestra la tarjeta)', () => {
  it('sin datos, las 5 filas están pendientes y en este orden', () => {
    const f = filasDeSalud(SIN_DATOS, hoy);
    expect(f.map((x) => x.etiqueta)).toEqual(['Nacimiento', 'Sexo', 'Tipo de sangre', 'Alergias', 'Alergias a medicamentos']);
    expect(f.every((x) => x.pendiente)).toBe(true);
  });

  it('con todo lleno muestra fecha con edad, sexo, sangre, etiquetas y «Ninguna conocida»', () => {
    const [nac, sexo, sangre, alergias, medicamentos] = filasDeSalud(completos, hoy);
    expect(nac).toMatchObject({ valor: '14 mar 1990', detalle: '36 años', pendiente: false });
    expect(sexo.valor).toBe('Hombre');
    expect(sangre.valor).toBe('O+');
    expect(alergias.etiquetas).toEqual(['Polen', 'Mariscos']);
    expect(medicamentos).toMatchObject({ valor: 'Ninguna conocida', pendiente: false });
  });

  it('un año se dice «1 año»', () => {
    expect(filasDeSalud({ ...completos, nacimiento: '2025-10-06' }, hoy)[0].detalle).toBe('1 año');
    expect(filasDeSalud({ ...completos, nacimiento: '2026-03-01' }, hoy)[0].detalle).toBe('0 años');
  });

  it('«No lo sé» se muestra tal cual, como respondido', () => {
    const f = filasDeSalud({ ...completos, tipoDeSangre: 'desconocido' }, hoy)[2];
    expect(f).toMatchObject({ valor: 'No lo sé', pendiente: false });
  });
});

describe('avisoDeSalud', () => {
  it('sin datos: faltan los 5 y el avance es 0', () => {
    expect(avisoDeSalud(SIN_DATOS)).toEqual({ titulo: 'Completa tu información de salud', texto: 'Te faltan 5 de 5 datos.', avance: 0 });
  });

  it('a medias: cuenta lo que falta y el avance', () => {
    const a = avisoDeSalud({ ...completos, alergias: { sinConocidas: false, items: [] }, alergiasAMedicamentos: { sinConocidas: false, items: [] } });
    expect(a).toEqual({ titulo: 'Completa tu información de salud', texto: 'Te faltan 2 de 5 datos.', avance: 0.6 });
  });

  it('si falta uno solo, lo dice en singular', () => {
    expect(avisoDeSalud({ ...completos, sexo: undefined })?.texto).toBe('Te falta 1 de 5 datos.');
  });

  it('completo: no hay aviso', () => {
    expect(avisoDeSalud(completos)).toBeNull();
  });
});

describe('botonDeSalud', () => {
  it('«Llenar» si no hay nada y «Editar» si ya hay algo', () => {
    expect(botonDeSalud(SIN_DATOS)).toBe('Llenar');
    expect(botonDeSalud({ ...SIN_DATOS, sexo: 'otro' })).toBe('Editar');
    expect(botonDeSalud(completos)).toBe('Editar');
  });
});

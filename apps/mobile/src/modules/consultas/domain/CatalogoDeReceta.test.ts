import { describe, expect, it } from 'vitest';

import {
  alternarFrase,
  CANTIDADES_DE_DOSIS,
  dosisTexto,
  DURACIONES_RAPIDAS,
  duracionTexto,
  FRECUENCIAS_CADA,
  FRECUENCIAS_VECES,
  frecuenciaCada,
  frecuenciaVeces,
  limiteDeDuracion,
  MAXIMO_DE_TEXTO_CORTO,
  UNIDADES_DE_DOSIS,
  VIAS,
} from './CatalogoDeReceta';

describe('dosisTexto (cuánto se toma cada vez)', () => {
  it('singular con ½ y 1, plural con más', () => {
    expect(dosisTexto('½', 'tableta')).toBe('½ tableta');
    expect(dosisTexto('1', 'tableta')).toBe('1 tableta');
    expect(dosisTexto('2', 'tableta')).toBe('2 tabletas');
    expect(dosisTexto('3', 'cápsula')).toBe('3 cápsulas');
  });

  it('unidades con plural especial o invariable', () => {
    expect(dosisTexto('1', 'gota')).toBe('1 gota');
    expect(dosisTexto('3', 'gota')).toBe('3 gotas');
    expect(dosisTexto('2', 'aplicación')).toBe('2 aplicaciones');
    expect(dosisTexto('2', 'inyección')).toBe('2 inyecciones');
    expect(dosisTexto('2', 'ml')).toBe('2 ml');
    expect(dosisTexto('1', 'ml')).toBe('1 ml');
  });

  it('una unidad desconocida se muestra tal cual', () => {
    expect(dosisTexto('2', 'xyz')).toBe('2 xyz');
  });

  it('el catálogo ofrece cantidades y unidades', () => {
    expect(CANTIDADES_DE_DOSIS).toEqual(['½', '1', '2', '3']);
    expect(UNIDADES_DE_DOSIS.map((u) => u.valor)).toContain('tableta');
  });
});

describe('frecuencias', () => {
  it('«cada N horas» y «N veces al día» salen con el texto exacto', () => {
    expect(frecuenciaCada(8)).toBe('Cada 8 horas');
    expect(frecuenciaCada(24)).toBe('Cada 24 horas');
    expect(frecuenciaVeces(1)).toBe('1 vez al día');
    expect(frecuenciaVeces(3)).toBe('3 veces al día');
  });

  it('las opciones del catálogo', () => {
    expect(FRECUENCIAS_CADA).toEqual([4, 6, 8, 12, 24]);
    expect(FRECUENCIAS_VECES).toEqual([1, 2, 3, 4]);
  });
});

describe('duracionTexto', () => {
  it('singular y plural por unidad', () => {
    expect(duracionTexto(1, 'dias')).toBe('1 día');
    expect(duracionTexto(7, 'dias')).toBe('7 días');
    expect(duracionTexto(1, 'semanas')).toBe('1 semana');
    expect(duracionTexto(2, 'semanas')).toBe('2 semanas');
    expect(duracionTexto(1, 'meses')).toBe('1 mes');
    expect(duracionTexto(3, 'meses')).toBe('3 meses');
  });

  it('límites razonables por unidad', () => {
    expect(limiteDeDuracion('dias')).toBe(365);
    expect(limiteDeDuracion('semanas')).toBe(52);
    expect(limiteDeDuracion('meses')).toBe(24);
  });

  it('los atajos de duración', () => {
    expect(DURACIONES_RAPIDAS.map((d) => duracionTexto(d.cantidad, d.unidad))).toEqual(['3 días', '5 días', '7 días', '10 días', '14 días', '1 mes']);
  });
});

describe('alternarFrase (chips de Indicaciones)', () => {
  it('agrega una frase a un texto vacío', () => {
    expect(alternarFrase('', 'Con alimentos')).toBe('Con alimentos');
  });

  it('agrega otra frase separándola con punto y espacio', () => {
    expect(alternarFrase('Con alimentos', 'En ayunas')).toBe('Con alimentos. En ayunas');
  });

  it('si la frase ya está, la quita sin tocar las demás', () => {
    expect(alternarFrase('Con alimentos. En ayunas. Mucha agua', 'En ayunas')).toBe('Con alimentos. Mucha agua');
    expect(alternarFrase('Con alimentos', 'Con alimentos')).toBe('');
  });

  it('conserva lo que el usuario escribió a mano', () => {
    expect(alternarFrase('Tomar con calma', 'Con alimentos')).toBe('Tomar con calma. Con alimentos');
    expect(alternarFrase('Tomar con calma. Con alimentos', 'Con alimentos')).toBe('Tomar con calma');
  });

  it('no confunde una frase con otra que la contiene', () => {
    expect(alternarFrase('Evitar alcohol y sol', 'Evitar alcohol')).toBe('Evitar alcohol y sol. Evitar alcohol');
  });

  it('un punto final del usuario no genera puntos dobles', () => {
    expect(alternarFrase('Con alimentos.', 'En ayunas')).toBe('Con alimentos. En ayunas');
  });
});

describe('catálogo de vías', () => {
  it('trae las vías de uso cotidiano, con Oral primero', () => {
    expect(VIAS[0].valor).toBe('Oral');
    expect(VIAS.map((v) => v.valor)).toEqual(expect.arrayContaining(['Sublingual', 'Tópica', 'Oftálmica', 'Ótica', 'Nasal', 'Inhalada']));
  });

  it('todos los textos caben en los 60 caracteres que admite cada campo', () => {
    const textos = [
      ...VIAS.map((v) => v.valor),
      ...FRECUENCIAS_CADA.map(frecuenciaCada),
      ...FRECUENCIAS_VECES.map(frecuenciaVeces),
      ...DURACIONES_RAPIDAS.map((d) => duracionTexto(d.cantidad, d.unidad)),
      duracionTexto(365, 'dias'),
      duracionTexto(24, 'meses'),
    ];
    for (const t of textos) expect(t.length).toBeLessThanOrEqual(MAXIMO_DE_TEXTO_CORTO);
  });
});

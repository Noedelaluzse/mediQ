import { describe, expect, it } from 'vitest';

import { mensajeSinResultados, textoDeResultados } from './resultadosDeBusqueda';

describe('resultadosDeBusqueda', () => {
  it('cuenta los resultados en singular y plural', () => {
    expect(textoDeResultados(1)).toBe('1 resultado');
    expect(textoDeResultados(12)).toBe('12 resultados');
  });

  it('el mensaje sin resultados cita lo buscado, recortado', () => {
    expect(mensajeSinResultados('  zzz ')).toBe('Sin resultados para «zzz»');
  });

  it('sugiere dónde se busca, para que se entienda por qué no aparece algo', () => {
    expect(mensajeSinResultados('x', true)).toContain('médico, especialidad o lugar');
  });
});

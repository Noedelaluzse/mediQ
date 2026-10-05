import { describe, expect, it } from 'vitest';

import { iniciales } from './iniciales';

describe('iniciales', () => {
  it('toma la primera letra del primer nombre y del último apellido', () => {
    expect(iniciales('Andrea López')).toBe('AL');
    expect(iniciales('Noe de la luz')).toBe('NL');
  });

  it('con un solo nombre usa una letra', () => {
    expect(iniciales('Andrea')).toBe('A');
  });

  it('va en mayúsculas y tolera espacios extra', () => {
    expect(iniciales('  ana   pérez ')).toBe('AP');
  });

  it('si no hay nombre devuelve un signo de interrogación', () => {
    expect(iniciales('')).toBe('?');
    expect(iniciales('   ')).toBe('?');
  });

  it('ignora los títulos Dr., Dra., Lic. al inicio (así lo muestra el diseño)', () => {
    expect(iniciales('Dra. Mariana Solís')).toBe('MS');
    expect(iniciales('Dr. Julián Pech')).toBe('JP');
    expect(iniciales('Dra. Ana Canul')).toBe('AC');
    expect(iniciales('dr julian pech')).toBe('JP');
  });

  it('si solo hay título y un nombre, usa el nombre', () => {
    expect(iniciales('Dr. Pech')).toBe('P');
  });
});

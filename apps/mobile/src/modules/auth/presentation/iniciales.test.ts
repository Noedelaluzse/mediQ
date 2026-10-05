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
});

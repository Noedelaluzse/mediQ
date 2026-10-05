import { describe, expect, it } from 'vitest';

import { generarId } from './generarId';

describe('generarId', () => {
  it('produce 20 caracteres alfanuméricos (válidos como id de Firestore)', () => {
    expect(generarId()).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  it('no repite ids', () => {
    const ids = new Set(Array.from({ length: 2000 }, generarId));
    expect(ids.size).toBe(2000);
  });
});

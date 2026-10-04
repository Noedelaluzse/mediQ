import { describe, expect, it } from 'vitest';

import { err, ok } from './Result';

describe('Result', () => {
  it('ok guarda el valor', () => {
    const r = ok(5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(5);
  });

  it('err guarda el error', () => {
    const r = err(new Error('x'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('x');
  });
});

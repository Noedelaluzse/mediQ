import { afterEach, describe, expect, it } from 'vitest';

import { appEstaBloqueada, publicarBloqueo, suscribirseAlBloqueo } from './bloqueoDeApp';

afterEach(() => publicarBloqueo(false));

describe('bloqueoDeApp (F036)', () => {
  it('empieza desbloqueada', () => {
    expect(appEstaBloqueada()).toBe(false);
  });

  it('avisa a quien escucha solo cuando cambia', () => {
    const vistos: boolean[] = [];
    const cancelar = suscribirseAlBloqueo(() => vistos.push(appEstaBloqueada()));
    publicarBloqueo(true);
    publicarBloqueo(true);
    publicarBloqueo(false);
    cancelar();
    publicarBloqueo(true);
    expect(vistos).toEqual([true, false]);
  });
});

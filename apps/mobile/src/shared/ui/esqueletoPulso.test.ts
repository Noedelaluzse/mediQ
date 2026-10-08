/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PULSO } from './esqueleto';

/**
 * P-15 (docs/17, F059): el parpadeo del esqueleto mantenía al iPhone al ≈ 12 % de CPU mientras hubiera un esqueleto en pantalla; si una
 * carga se quedaba colgada, para siempre. Ahora el parpadeo tiene tope y después el bloque queda quieto. Aquí no se renderizan pantallas:
 * la prueba lee el código, como en F049.
 */
describe('PULSO (parpadeo con tope)', () => {
  it('el parpadeo dura 10 segundos como máximo', () => {
    expect(PULSO.maxMs).toBe(10_000);
  });

  it('el tope da para varios parpadeos completos: un esqueleto normal nunca llega a notarlo', () => {
    expect(PULSO.maxMs).toBeGreaterThanOrEqual(PULSO.duracionMs * 2 * 5);
  });

  it('en reposo (tope alcanzado o «reducir movimiento») el bloque queda entre el mínimo y el máximo del parpadeo', () => {
    expect(PULSO.reposo).toBeGreaterThan(PULSO.desde);
    expect(PULSO.reposo).toBeLessThan(PULSO.hasta);
  });
});

describe('GrupoDeEsqueletos', () => {
  const fuente = readFileSync(resolve(__dirname, 'Esqueleto.tsx'), 'utf8');

  it('detiene el parpadeo al llegar al tope y deja el bloque en reposo', () => {
    expect(fuente).toMatch(/setTimeout\([\s\S]{0,200}PULSO\.maxMs\)/);
    expect(fuente).toContain('opacidad.setValue(PULSO.reposo)');
  });

  it('cancela el temporizador al desmontarse', () => {
    expect(fuente).toContain('clearTimeout(');
  });

  it('no deja números sueltos para el reposo', () => {
    expect(fuente).not.toContain('setValue(0.75)');
  });
});

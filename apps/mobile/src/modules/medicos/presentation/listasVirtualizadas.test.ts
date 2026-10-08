/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P-03 (docs/17, F057): las listas de médicos dibujaban todos los elementos de golpe (`ScrollView` + `.map()`). Aquí no se pueden
 * renderizar pantallas, así que, como con el autolinking en F049, esta prueba lee el código y vigila que no vuelva.
 */
const codigo = (archivo: string) => readFileSync(resolve(__dirname, archivo), 'utf8');

describe.each(['MedicosScreen.tsx', 'MedicosElegirScreen.tsx'])('%s (P-03: lista virtualizada)', (archivo) => {
  const fuente = codigo(archivo);

  it('usa FlatList', () => {
    expect(fuente).toMatch(/import \{[^}]*\bFlatList\b[^}]*\} from 'react-native'/);
    expect(fuente).toContain('<FlatList');
  });

  it('no dibuja los médicos con ScrollView + .map()', () => {
    expect(fuente).not.toContain('<ScrollView');
    expect(fuente).not.toMatch(/\.map\(\(\{ medico: m/);
  });

  it('da una clave estable por médico (su id)', () => {
    expect(fuente).toMatch(/keyExtractor=\{\([^)]*\) => [a-z]+\.medico\.id\}/);
  });
});

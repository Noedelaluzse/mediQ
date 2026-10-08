/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P-03 (docs/17, F057): las listas de médicos dibujaban todos los elementos de golpe (`ScrollView` + `.map()`). Aquí no se pueden
 * renderizar pantallas, así que, como con el autolinking en F049, esta prueba lee el código y vigila que no vuelva.
 */
const codigo = (archivo: string) => readFileSync(resolve(__dirname, archivo), 'utf8');

// [archivo, cómo se llama el elemento con el id que da la clave estable, cómo se dibujaba antes con .map()]
const listas: [string, string, RegExp][] = [
  ['MedicosScreen.tsx', 'i.medico.id', /\.map\(\(\{ medico: m/],
  ['MedicosElegirScreen.tsx', 'i.medico.id', /\.map\(\(\{ medico: m/],
  // F061 (AUD-14): el último tramo de P-03.
  ['LugaresScreen.tsx', 'l.lugar.id', /lugares\?\.map\(/],
];

describe.each(listas)('%s (P-03: lista virtualizada)', (archivo, claveDeFila, dibujoViejo) => {
  const fuente = codigo(archivo);

  it('usa FlatList', () => {
    expect(fuente).toMatch(/import \{[^}]*\bFlatList\b[^}]*\} from 'react-native'/);
    expect(fuente).toContain('<FlatList');
  });

  it('no dibuja los médicos con ScrollView + .map()', () => {
    expect(fuente).not.toContain('<ScrollView');
    expect(fuente).not.toMatch(dibujoViejo);
  });

  it('da una clave estable por médico (su id)', () => {
    expect(fuente).toContain(`keyExtractor={(${claveDeFila.split('.')[0]}) => ${claveDeFila}}`);
  });
});

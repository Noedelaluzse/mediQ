/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P-06 (F058): estas pantallas cargaban sus datos con `useFocusEffect` y, por tanto, en cada vuelta. Ahora usan `useRecargaAlEnfocar`,
 * que recarga solo si algo cambió o pasó el minuto de vigencia. Aquí no se renderizan pantallas: la prueba lee el código.
 */
const pantallas = [
  'modules/consultas/presentation/DiarioScreen.tsx',
  'modules/consultas/presentation/ConsultaDetalleScreen.tsx',
  'modules/consultas/presentation/useTomasDeHoy.ts',
  'modules/auth/presentation/PerfilScreen.tsx',
  'modules/medicos/presentation/MedicosScreen.tsx',
  'modules/medicos/presentation/MedicosElegirScreen.tsx',
  'modules/medicos/presentation/MedicoDetalleScreen.tsx',
  'modules/medicos/presentation/LugaresScreen.tsx',
];

describe.each(pantallas)('%s', (archivo) => {
  const fuente = readFileSync(resolve(__dirname, '..', archivo), 'utf8');

  it('carga con useRecargaAlEnfocar', () => {
    expect(fuente).toContain('useRecargaAlEnfocar(');
  });

  // useTomasDeHoy conserva un useFocusEffect, pero solo para su reloj (se detiene al salir de la pantalla), no para cargar datos.
  const soloReloj = archivo.endsWith('useTomasDeHoy.ts');

  it('ya no recarga en cada foco con useFocusEffect', () => {
    if (soloReloj) expect(fuente).not.toMatch(/useFocusEffect\([\s\S]{0,200}void cargar\(\);\s*const reloj/);
    else expect(fuente).not.toContain('useFocusEffect(');
  });
});

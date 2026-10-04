import { createContext, useContext, type ReactNode } from 'react';

import { verde } from './palettes/verde';
import { crearTema, type Tema } from './tokens';

// La única línea que cambia para usar otra paleta.
export const tema = crearTema(verde);

const TemaContext = createContext<Tema>(tema);

export function ThemeProvider({ value = tema, children }: { value?: Tema; children: ReactNode }) {
  return <TemaContext.Provider value={value}>{children}</TemaContext.Provider>;
}

export const useTema = (): Tema => useContext(TemaContext);
export { crearTema } from './tokens';
export type { Tema } from './tokens';

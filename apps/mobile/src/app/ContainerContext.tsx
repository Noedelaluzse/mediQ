import { createContext, useContext, type ReactNode } from 'react';

import type { Container } from './container';

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({ container, children }: { container: Container; children: ReactNode }) {
  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

/** La presentación pide casos de uso por nombre; nunca instancia repositorios. */
export function useCasoDeUso<K extends keyof Container>(nombre: K): Container[K] {
  const c = useContext(ContainerContext);
  if (!c) throw new Error('ContainerProvider ausente');
  return c[nombre];
}

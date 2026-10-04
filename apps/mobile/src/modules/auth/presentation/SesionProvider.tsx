import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useCasoDeUso } from '@/app/ContainerContext';
import type { Result } from '@/shared/kernel/Result';

import type { Sesion } from '../domain/Sesion';

export type EstadoDeSesion = 'cargando' | 'sinSesion' | 'avisoPendiente' | 'activa';

type Valor = {
  estado: EstadoDeSesion;
  sesion: Sesion | null;
  iniciarSesion: () => Promise<Result<Sesion, Error>>;
  aceptarAviso: () => Promise<void>;
};

const SesionContext = createContext<Valor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const iniciar = useCasoDeUso('iniciarSesionConGoogle');
  const obtener = useCasoDeUso('obtenerSesionActual');
  const aceptar = useCasoDeUso('aceptarAvisoDePrivacidad');
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);

  useEffect(() => {
    let vivo = true;
    obtener.ejecutar().then((s) => vivo && setSesion(s));
    return () => {
      vivo = false;
    };
  }, [obtener]);

  const iniciarSesion = useCallback(async () => {
    const r = await iniciar.ejecutar();
    if (r.ok) setSesion(r.value);
    return r;
  }, [iniciar]);

  const aceptarAviso = useCallback(async () => {
    const actualizada = await aceptar.ejecutar();
    if (actualizada) setSesion(actualizada);
  }, [aceptar]);

  const valor = useMemo<Valor>(() => {
    const estado: EstadoDeSesion =
      sesion === undefined ? 'cargando' : sesion === null ? 'sinSesion' : sesion.primeraVez ? 'avisoPendiente' : 'activa';
    return { estado, sesion: sesion ?? null, iniciarSesion, aceptarAviso };
  }, [sesion, iniciarSesion, aceptarAviso]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Valor {
  const v = useContext(SesionContext);
  if (!v) throw new Error('SesionProvider ausente');
  return v;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useCasoDeUso } from '@/app/ContainerContext';
import { err, ok, type Result } from '@/shared/kernel/Result';

import { DOCUMENTOS, type Documento } from '../domain/Consentimiento';
import type { Sesion } from '../domain/Sesion';

export type EstadoDeSesion = 'cargando' | 'sinSesion' | 'avisoPendiente' | 'activa';

type ResultadoDeLogin = { sesion: Sesion; consentimientoPendiente: boolean };

type Valor = {
  estado: EstadoDeSesion;
  sesion: Sesion | null;
  iniciarSesion: () => Promise<Result<ResultadoDeLogin, Error>>;
  aceptarAviso: () => Promise<void>;
};

type Estado = { sesion: Sesion | null; pendientes: Documento[] };

const SesionContext = createContext<Valor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const iniciar = useCasoDeUso('iniciarSesionConGoogle');
  const obtener = useCasoDeUso('obtenerSesionActual');
  const aceptar = useCasoDeUso('aceptarAvisoDePrivacidad');
  const consultar = useCasoDeUso('consultarConsentimientosPendientes');
  const [estado, setEstado] = useState<Estado | undefined>(undefined);

  // Si no se puede saber qué aceptó el usuario, se asume que falta todo: sin consentimiento no se avanza.
  const pendientesDe = useCallback(
    (sesion: Sesion) => consultar.ejecutar(sesion.usuario.id).catch(() => [...DOCUMENTOS]),
    [consultar],
  );

  useEffect(() => {
    let vivo = true;
    (async () => {
      const sesion = await obtener.ejecutar();
      const pendientes = sesion ? await pendientesDe(sesion) : [];
      if (vivo) setEstado({ sesion, pendientes });
    })();
    return () => {
      vivo = false;
    };
  }, [obtener, pendientesDe]);

  const iniciarSesion = useCallback(async (): Promise<Result<ResultadoDeLogin, Error>> => {
    const r = await iniciar.ejecutar();
    if (!r.ok) return err(r.error);
    const pendientes = await pendientesDe(r.value);
    setEstado({ sesion: r.value, pendientes });
    return ok({ sesion: r.value, consentimientoPendiente: pendientes.length > 0 });
  }, [iniciar, pendientesDe]);

  const aceptarAviso = useCallback(async () => {
    const actualizada = await aceptar.ejecutar();
    if (actualizada) setEstado({ sesion: actualizada, pendientes: [] });
  }, [aceptar]);

  const valor = useMemo<Valor>(() => {
    const derivado: EstadoDeSesion =
      estado === undefined
        ? 'cargando'
        : estado.sesion === null
          ? 'sinSesion'
          : estado.pendientes.length > 0
            ? 'avisoPendiente'
            : 'activa';
    return { estado: derivado, sesion: estado?.sesion ?? null, iniciarSesion, aceptarAviso };
  }, [estado, iniciarSesion, aceptarAviso]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Valor {
  const v = useContext(SesionContext);
  if (!v) throw new Error('SesionProvider ausente');
  return v;
}

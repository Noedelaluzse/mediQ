import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useCasoDeUso } from '@/app/ContainerContext';
import { diagnostico } from '@/shared/kernel/diagnostico';

import type { EstadoDelCandado } from '../application/ObtenerEstadoDelCandado';
import { debeBloquear, type ResultadoBiometrico } from '../domain/Candado';
import { useSesion } from './SesionProvider';

type Valor = {
  /** Lo guardado y lo que el teléfono permite; null mientras se lee. */
  estado: EstadoDelCandado | null;
  /** La app está tapada por la pantalla de bloqueo (o se está leyendo si hay que taparla). */
  bloqueada: boolean;
  /** Lo último que respondió el teléfono al pedir Face ID (null = aún no se intenta). */
  ultimoResultado: ResultadoBiometrico | null;
  /** No se pudo leer el candado (F072): la app sigue tapada y se ofrece reintentar o cerrar sesión. */
  noSePudoComprobar: boolean;
  reintentar: () => void;
  desbloquear: () => Promise<void>;
  activar: () => Promise<'activado' | 'cancelado' | 'fallo' | 'noDisponible'>;
  desactivar: () => Promise<void>;
};

const CandadoContext = createContext<Valor | null>(null);

/**
 * Candado con Face ID / huella (F036). Se abre bloqueada (si está activado), y al volver de segundo plano se vuelve a bloquear
 * pasado el minuto de gracia. Solo cuenta el paso a segundo plano de verdad: un permiso o el propio Face ID dejan la app «inactiva»
 * un momento y no deben bloquearla.
 */
export function CandadoProvider({ children }: { children: ReactNode }) {
  const { estado: estadoDeSesion } = useSesion();
  const obtenerEstado = useCasoDeUso('obtenerEstadoDelCandado');
  const activarCandado = useCasoDeUso('activarCandado');
  const desactivarCandado = useCasoDeUso('desactivarCandado');
  const desbloquearConBiometria = useCasoDeUso('desbloquearConBiometria');
  const [estado, setEstado] = useState<EstadoDelCandado | null>(null);
  // Al abrir la app la pantalla de bloqueo ya está puesta: no hay un instante con el contenido a la vista.
  const [bloqueada, setBloqueada] = useState(true);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoBiometrico | null>(null);
  const [noSePudoComprobar, setNoSePudoComprobar] = useState(false);
  const [intento, setIntento] = useState(0);
  const salioEn = useRef<number | null>(null);
  const preguntando = useRef(false);
  const activadoRef = useRef(false);
  const sesionActiva = estadoDeSesion === 'activa';

  // Con la sesión activa se lee el candado (también tras iniciar sesión: al cerrarla se olvidó). Sin sesión no hay nada que bloquear.
  useEffect(() => {
    if (estadoDeSesion === 'sinSesion') {
      activadoRef.current = false;
      // Fuera de la sesión no queda nada que proteger: se olvida lo leído (en un callback, no dentro del efecto).
      void Promise.resolve().then(() => {
        setEstado(null);
        setNoSePudoComprobar(false);
        setBloqueada(false);
      });
      return;
    }
    if (!sesionActiva) return;
    let vivo = true;
    obtenerEstado.ejecutar().then(
      (e) => {
        if (!vivo) return;
        activadoRef.current = e.activado;
        setEstado(e);
        setNoSePudoComprobar(false);
        setBloqueada(debeBloquear({ activado: e.activado, salioEnMs: null, ahoraMs: Date.now() }));
      },
      (error) => {
        // F072: sin poder leer el candado NO se abre la app (podría estar activado): se queda tapada con «Reintentar» y «Cerrar sesión».
        diagnostico.advertir('no se pudo leer el candado', error);
        if (!vivo) return;
        setNoSePudoComprobar(true);
        setBloqueada(true);
      },
    );
    return () => {
      vivo = false;
    };
  }, [estadoDeSesion, sesionActiva, obtenerEstado, intento]);

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'background') {
        salioEn.current = Date.now();
        return;
      }
      if (siguiente !== 'active' || salioEn.current === null) return;
      const salio = salioEn.current;
      salioEn.current = null;
      if (debeBloquear({ activado: activadoRef.current, salioEnMs: salio, ahoraMs: Date.now() })) setBloqueada(true);
    });
    return () => suscripcion.remove();
  }, []);

  const reintentar = useCallback(() => {
    setNoSePudoComprobar(false);
    setEstado(null);
    setIntento((n) => n + 1);
  }, []);

  const desbloquear = useCallback(async () => {
    if (preguntando.current) return;
    preguntando.current = true;
    try {
      const r = await desbloquearConBiometria.ejecutar();
      setUltimoResultado(r);
      if (r === 'ok') setBloqueada(false);
    } catch (error) {
      diagnostico.advertir('falló la verificación del candado', error);
      setUltimoResultado('fallo');
    } finally {
      preguntando.current = false;
    }
  }, [desbloquearConBiometria]);

  // Al taparse la app se pide Face ID de una vez; si se cancela, queda el botón «Desbloquear».
  const debePreguntar = sesionActiva && bloqueada && estado?.activado === true;
  useEffect(() => {
    if (debePreguntar) void Promise.resolve().then(desbloquear);
  }, [debePreguntar, desbloquear]);

  const refrescar = useCallback(async () => {
    const e = await obtenerEstado.ejecutar();
    activadoRef.current = e.activado;
    setEstado(e);
  }, [obtenerEstado]);

  const activar = useCallback(async () => {
    const r = await activarCandado.ejecutar();
    if (r === 'activado') await refrescar();
    return r;
  }, [activarCandado, refrescar]);

  const desactivar = useCallback(async () => {
    await desactivarCandado.ejecutar();
    await refrescar();
    setBloqueada(false);
  }, [desactivarCandado, refrescar]);

  const valor = useMemo(
    () => ({ estado, bloqueada, ultimoResultado, noSePudoComprobar, reintentar, desbloquear, activar, desactivar }),
    [estado, bloqueada, ultimoResultado, noSePudoComprobar, reintentar, desbloquear, activar, desactivar],
  );
  return <CandadoContext.Provider value={valor}>{children}</CandadoContext.Provider>;
}

export function useCandado(): Valor {
  const v = useContext(CandadoContext);
  if (!v) throw new Error('CandadoProvider ausente');
  return v;
}

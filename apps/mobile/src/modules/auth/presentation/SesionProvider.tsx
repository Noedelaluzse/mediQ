import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useCasoDeUso } from '@/app/ContainerContext';
import { err, ok, type Result } from '@/shared/kernel/Result';

import { DOCUMENTOS, type Documento } from '../domain/Consentimiento';
import type { Sesion } from '../domain/Sesion';
import { accionTrasReintentar, derivarEstado, restaurarEstado, type EstadoGuardado } from './estadoDeSesion';

export type { EstadoDeSesion } from './estadoDeSesion';
import type { EstadoDeSesion } from './estadoDeSesion';

/** Cada cuánto se reintenta verificar la sesión guardada si el teléfono dice que hay internet pero Google o Firebase no respondían. */
const REINTENTO_MS = 30_000;

type ResultadoDeLogin = { sesion: Sesion; consentimientoPendiente: boolean };

type Valor = {
  estado: EstadoDeSesion;
  sesion: Sesion | null;
  iniciarSesion: () => Promise<Result<ResultadoDeLogin, Error>>;
  aceptarAviso: () => Promise<void>;
  /** 'simulado' = sin Firebase: iniciar sesión y eliminar la cuenta no tocan la nube. */
  modo: 'firebase' | 'simulado';
  cerrarSesion: () => Promise<void>;
  eliminarCuenta: () => Promise<Result<void, Error>>;
};


const SesionContext = createContext<Valor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const modo = useCasoDeUso('modo');
  const iniciar = useCasoDeUso('iniciarSesionConGoogle');
  const obtener = useCasoDeUso('obtenerSesionActual');
  const aceptar = useCasoDeUso('aceptarAvisoDePrivacidad');
  const consultar = useCasoDeUso('consultarConsentimientosPendientes');
  const cerrar = useCasoDeUso('cerrarSesion');
  const eliminar = useCasoDeUso('eliminarCuenta');
  const redDelTelefono = useCasoDeUso('redDelTelefono');
  const verificacion = useCasoDeUso('verificacionDeSesion');
  const [estado, setEstado] = useState<EstadoGuardado | undefined>(undefined);

  // La app solo se porta como «con internet» si la sesión está verificada (F052): mientras no, usa sus copias y retiene los envíos.
  const fijar = useCallback(
    (nuevo: EstadoGuardado) => {
      if (nuevo.sesion && nuevo.sinVerificar) verificacion.ponerSinVerificar();
      else verificacion.ponerVerificada();
      setEstado(nuevo);
    },
    [verificacion],
  );

  // Si no se puede saber qué aceptó el usuario, se asume que falta todo: sin consentimiento no se avanza.
  const pendientesDe = useCallback(
    (sesion: Sesion) => consultar.ejecutar(sesion.usuario.id).catch(() => [...DOCUMENTOS]),
    [consultar],
  );

  useEffect(() => {
    let vivo = true;
    (async () => {
      const inicial = await restaurarEstado(() => obtener.ejecutar(), pendientesDe);
      if (vivo) fijar(inicial);
    })();
    return () => {
      vivo = false;
    };
  }, [obtener, pendientesDe, fijar]);

  // Se entró con la sesión guardada sin poder comprobarla (sin internet): al volver la conexión, al volver a la app y cada cierto
  // tiempo se intenta verificarla. Si Google o Firebase la rechazan de verdad, se cierra la sesión y se pide iniciar de nuevo.
  const sinVerificar = estado?.sinVerificar === true;
  useEffect(() => {
    if (!sinVerificar) return;
    let vivo = true;
    let enCurso = false;
    const reintentar = async () => {
      if (enCurso || !(await redDelTelefono.estaConectado())) return;
      enCurso = true;
      try {
        const nuevo = await restaurarEstado(() => obtener.ejecutar(), pendientesDe);
        if (!vivo) return;
        const accion = accionTrasReintentar(nuevo);
        if (accion === 'mantener') return;
        if (accion === 'cerrar-sesion') await cerrar.ejecutar().catch(() => undefined);
        if (vivo) fijar(nuevo);
      } catch {
        // Se reintenta con el siguiente cambio de red o a los 30 s.
      } finally {
        enCurso = false;
      }
    };
    const baja = redDelTelefono.suscribir((conectado) => conectado && void reintentar());
    const app = AppState.addEventListener('change', (e) => e === 'active' && void reintentar());
    const reloj = setInterval(() => void reintentar(), REINTENTO_MS);
    return () => {
      vivo = false;
      baja();
      app.remove();
      clearInterval(reloj);
    };
  }, [sinVerificar, redDelTelefono, obtener, pendientesDe, cerrar, fijar]);

  const iniciarSesion = useCallback(async (): Promise<Result<ResultadoDeLogin, Error>> => {
    const r = await iniciar.ejecutar();
    if (!r.ok) return err(r.error);
    const pendientes = await pendientesDe(r.value);
    fijar({ sesion: r.value, pendientes, sinVerificar: false });
    return ok({ sesion: r.value, consentimientoPendiente: pendientes.length > 0 });
  }, [iniciar, pendientesDe, fijar]);

  const aceptarAviso = useCallback(async () => {
    const actualizada = await aceptar.ejecutar();
    if (actualizada) fijar({ sesion: actualizada, pendientes: [], sinVerificar: false });
  }, [aceptar, fijar]);

  const cerrarSesion = useCallback(async () => {
    await cerrar.ejecutar();
    fijar({ sesion: null, pendientes: [], sinVerificar: false });
  }, [cerrar, fijar]);

  const eliminarCuenta = useCallback(async (): Promise<Result<void, Error>> => {
    const r = await eliminar.ejecutar();
    if (!r.ok) return err(r.error);
    fijar({ sesion: null, pendientes: [], sinVerificar: false });
    return ok(undefined);
  }, [eliminar, fijar]);

  const valor = useMemo<Valor>(() => {
    const derivado: EstadoDeSesion = derivarEstado(estado);
    return { estado: derivado, sesion: estado?.sesion ?? null, modo, iniciarSesion, aceptarAviso, cerrarSesion, eliminarCuenta };
  }, [estado, modo, iniciarSesion, aceptarAviso, cerrarSesion, eliminarCuenta]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Valor {
  const v = useContext(SesionContext);
  if (!v) throw new Error('SesionProvider ausente');
  return v;
}

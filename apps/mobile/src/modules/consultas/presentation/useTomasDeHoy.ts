import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { useRecargaAlEnfocar } from '@/app/useRecargaAlEnfocar';
import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';

import { conEstadoActual, type TomaDelDia } from '../domain/TomasDelDia';
import type { TomaDeHoy } from './TarjetaDeHoy';
import { aTomaDeHoy } from './tomaDeHoy';

const MINUTO = 60_000;

/**
 * Las tomas de hoy para la tarjeta del Diario (F029). Se leen al enfocar la pantalla y al volver a la app (por si se marcó desde el
 * aviso); el paso del tiempo (pendiente → atrasada) se recalcula cada minuto sin volver a consultar. Marcar y deshacer se ven al
 * instante y se confirman en segundo plano; si fallan, vuelve lo real y se avisa. Los fallos de lectura no se muestran: sin tarjeta.
 */
export function useTomasDeHoy(): { tomas: TomaDeHoy[]; marcar: (id: string) => void; deshacer: (id: string) => void } {
  const obtener = useCasoDeUso('obtenerTomasDeHoy');
  const registrar = useCasoDeUso('registrarToma');
  const deshacerToma = useCasoDeUso('deshacerToma');
  const sincronizar = useCasoDeUso('sincronizarAvisosDeTomas');

  const [base, setBase] = useState<TomaDelDia[]>([]);
  const [ahora, setAhora] = useState(() => new Date());
  const diaCargado = useRef(ahora.getDate());

  const cargar = useCallback(() => {
    const momento = new Date();
    diaCargado.current = momento.getDate();
    setAhora(momento);
    return obtener.ejecutar().then(
      (r) => {
        setBase(r.tomas);
        return true;
      },
      () => false,
    );
  }, [obtener]);

  // Las tomas se leen al abrir y, al volver, solo si algo cambió o pasó el minuto de vigencia (P-06).
  useRecargaAlEnfocar(cargar, 'Tomas de hoy');

  useFocusEffect(
    useCallback(() => {
      // Al volver a la pantalla el reloj se pone al día de inmediato: sin recarga, el estado de cada toma (a tiempo / atrasada) se calcula con la hora de antes.
      const volvio = new Date();
      setAhora(volvio);
      // Pasó la medianoche mientras estaba en otra pestaña: las tomas de «hoy» son otras.
      if (volvio.getDate() !== diaCargado.current) void cargar();
      const reloj = setInterval(() => {
        const momento = new Date();
        // Pasó la medianoche: las tomas de «hoy» son otras.
        if (momento.getDate() !== diaCargado.current) void cargar();
        else setAhora(momento);
      }, MINUTO);
      return () => clearInterval(reloj);
    }, [cargar]),
  );

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => estado === 'active' && void cargar());
    return () => suscripcion.remove();
  }, [cargar]);

  const tomas = useMemo(() => conEstadoActual(base, ahora).map(aTomaDeHoy), [base, ahora]);

  const fallo = useCallback(
    (error: unknown) => {
      diagnostico.advertir('no se pudo actualizar una toma', error);
      Alert.alert('No pudimos guardar', 'Revisa tu conexión e inténtalo de nuevo.');
      void cargar();
    },
    [cargar],
  );

  const marcar = useCallback(
    (id: string) => {
      const t = base.find((x) => x.tomaId === id);
      if (!t) return;
      setBase((b) => b.map((x) => (x.tomaId === id ? { ...x, estado: 'tomada', tomadaEn: new Date() } : x)));
      registrar
        .ejecutar(t.toma, t.consultaId)
        .then(() => sincronizar.ejecutar())
        .catch(fallo);
    },
    [base, registrar, sincronizar, fallo],
  );

  const deshacer = useCallback(
    (id: string) => {
      setBase((b) => b.map((x) => (x.tomaId === id ? { ...x, estado: 'pendiente', tomadaEn: undefined } : x)));
      deshacerToma
        .ejecutar(id)
        .then(() => sincronizar.ejecutar())
        .then(cargar)
        .catch(fallo);
    },
    [deshacerToma, sincronizar, cargar, fallo],
  );

  return { tomas, marcar, deshacer };
}

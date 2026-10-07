import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { diagnostico } from '@/shared/kernel/diagnostico';
import { useCasoDeUso } from '@/app/ContainerContext';

import { interpretarRespuesta } from '../domain/DatosDeAviso';

/**
 * Qué pasa cuando el usuario toca un aviso (también si la app estaba cerrada): abre el detalle de la consulta, y en los avisos de
 * toma quita la insistencia. Los botones «Ya la tomé» y «Recordar en 5 min» registran la dosis o la posponen (F027).
 */
export function useAvisoTocado(): void {
  const respuesta = Notifications.useLastNotificationResponse();
  const atendida = useRef<string | null>(null);
  const registrarToma = useCasoDeUso('registrarToma');
  const posponerToma = useCasoDeUso('posponerToma');
  const cancelarInsistencia = useCasoDeUso('cancelarInsistenciaDeToma');
  const sincronizarTomas = useCasoDeUso('sincronizarAvisosDeTomas');

  useEffect(() => {
    if (!respuesta) return;
    const { identifier, content } = respuesta.notification.request;
    const clave = `${identifier}|${respuesta.actionIdentifier}`;
    if (atendida.current === clave) return;
    atendida.current = clave;

    const accion = interpretarRespuesta(respuesta.actionIdentifier, content.data);
    if (!accion) return;
    const avisarDelFallo = (error: unknown) => {
      diagnostico.advertir('no se pudo atender el aviso de toma', error);
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo desde la consulta.');
    };

    if (accion.tipo === 'abrir') {
      if (accion.toma) cancelarInsistencia.ejecutar(accion.toma).catch((e) => diagnostico.advertir('no se pudo quitar la insistencia', e));
      router.push({ pathname: '/consulta-detalle', params: { id: accion.consultaId } });
      return;
    }
    const hecho = accion.tipo === 'tomada' ? registrarToma.ejecutar(accion.toma, accion.consultaId) : posponerToma.ejecutar(accion.toma, accion.consultaId);
    hecho
      .then(() => {
        Alert.alert(accion.tipo === 'tomada' ? 'Anotado' : 'Te avisaremos en 5 minutos', accion.tipo === 'tomada' ? `Registramos tu dosis de ${accion.toma.medicamento}.` : accion.toma.medicamento);
        // Reprograma ya con la dosis registrada o pospuesta, para que no reaparezca la insistencia cancelada.
        return sincronizarTomas.ejecutar();
      })
      .catch(avisarDelFallo);
  }, [respuesta, registrarToma, posponerToma, cancelarInsistencia, sincronizarTomas]);
}

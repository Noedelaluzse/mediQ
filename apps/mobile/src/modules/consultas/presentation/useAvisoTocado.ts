import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Al tocar un aviso de cita (también si la app estaba cerrada) abre el detalle de esa consulta. */
export function useAvisoTocado(): void {
  const respuesta = Notifications.useLastNotificationResponse();
  const atendida = useRef<string | null>(null);

  useEffect(() => {
    if (!respuesta) return;
    const { identifier, content } = respuesta.notification.request;
    if (atendida.current === identifier) return;
    atendida.current = identifier;
    const consultaId = content.data?.consultaId;
    if (typeof consultaId === 'string') router.push({ pathname: '/consulta-detalle', params: { id: consultaId } });
  }, [respuesta]);
}

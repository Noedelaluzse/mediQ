import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useCasoDeUso } from '@/app/ContainerContext';

import { publicarCola } from './colaDeEnvio';

const CADA_MINUTO = 60_000;

/**
 * Envía las consultas capturadas sin internet (RNF-11, F030): al abrir la app, al volver a ella, al volver la conexión y cada
 * minuto mientras haya algo por enviar. Después deja la lista al día para el Diario y, si se envió algo, repone los avisos de citas
 * (una consulta con próxima cita capturada sin internet no pudo programarlos). Se monta solo con la sesión activa. No muestra fallos.
 */
export function useEnvioDePendientes(): void {
  const listar = useCasoDeUso('listarConsultasPendientes');
  const enviar = useCasoDeUso('enviarConsultasPendientes');
  const sincronizarAvisos = useCasoDeUso('sincronizarAvisosDeCitas');
  const red = useCasoDeUso('conectividad');

  const sincronizar = useCallback(async () => {
    let enviadas = 0;
    try {
      enviadas = (await enviar.ejecutar()).enviadas;
    } catch (error) {
      console.warn('[MediQ] no se pudieron enviar las consultas pendientes', error);
    }
    try {
      publicarCola(await listar.ejecutar(), enviadas);
    } catch (error) {
      console.warn('[MediQ] no se pudo leer la cola de envío', error);
    }
    if (enviadas > 0) sincronizarAvisos.ejecutar().catch(() => undefined);
  }, [enviar, listar, sincronizarAvisos]);

  useEffect(() => {
    void sincronizar();
    const estado = AppState.addEventListener('change', (e) => e === 'active' && void sincronizar());
    const baja = red.suscribir((conectado) => conectado && void sincronizar());
    const reloj = setInterval(() => void sincronizar(), CADA_MINUTO);
    return () => {
      estado.remove();
      baja();
      clearInterval(reloj);
    };
  }, [red, sincronizar]);
}

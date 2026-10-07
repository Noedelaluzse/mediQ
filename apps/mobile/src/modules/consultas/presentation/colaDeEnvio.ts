import { useSyncExternalStore } from 'react';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';

/**
 * Lo que ve la pantalla de la cola de envío (F030): la lista de consultas por enviar y un contador de envíos completados. Lo
 * alimenta el hook que envía (`useEnvioDePendientes`) y lo leen el Diario y el Perfil. El Diario recarga cuando el contador sube.
 */
let cola: ConsultaPendiente[] = [];
let envios = 0;
const oyentes = new Set<() => void>();

const firma = (lista: ConsultaPendiente[]): string => lista.map((c) => `${c.id}|${c.intentos}|${c.error ?? ''}`).join(',');
const avisar = () => oyentes.forEach((o) => o());

export const colaDeEnvio = (): ConsultaPendiente[] => cola;
export const enviosCompletados = (): number => envios;

/** Deja la lista al día; `enviadas` es cuántas se enviaron en este intento. Publicar lo mismo no avisa ni cambia la referencia. */
export function publicarCola(lista: ConsultaPendiente[], enviadas = 0): void {
  const cambio = firma(lista) !== firma(cola);
  if (enviadas > 0) envios += enviadas;
  if (cambio) cola = lista;
  if (cambio || enviadas > 0) avisar();
}

export function suscribirCola(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => void oyentes.delete(oyente);
}

/** Para las pruebas y al cerrar sesión. */
export function limpiarColaDeEnvio(): void {
  cola = [];
  envios = 0;
  avisar();
}

export const useColaDeEnvio = (): ConsultaPendiente[] => useSyncExternalStore(suscribirCola, colaDeEnvio);
export const useEnviosCompletados = (): number => useSyncExternalStore(suscribirCola, enviosCompletados);

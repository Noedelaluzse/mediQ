import { useSyncExternalStore } from 'react';

import { resumenDePendientes, type DatosDeSalud } from '../domain/DatosDeSalud';

/** Si faltan datos de salud: lo lee la pestaña Perfil para su puntito, y lo actualizan el Perfil y el formulario al cargar o guardar. */
let pendiente = false;
const oyentes = new Set<() => void>();

export const saludPendiente = (): boolean => pendiente;

export function publicarSalud(datos: DatosDeSalud): void {
  const nuevo = !resumenDePendientes(datos).completo;
  if (nuevo === pendiente) return;
  pendiente = nuevo;
  oyentes.forEach((o) => o());
}

export function suscribirSaludPendiente(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => void oyentes.delete(oyente);
}

/** Para las pruebas y al cerrar sesión: vuelve al estado de «no se sabe nada». */
export function limpiarSaludPendiente(): void {
  pendiente = false;
  oyentes.forEach((o) => o());
}

export const useSaludPendiente = (): boolean => useSyncExternalStore(suscribirSaludPendiente, saludPendiente);

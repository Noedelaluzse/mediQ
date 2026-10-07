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

/** Aviso temporal de «información completa»: lo deja el formulario al guardar y lo recoge el Perfil, una sola vez. */
let anuncioPendiente = false;

/** Completó los 5 datos con este guardado (antes faltaba algo y ahora no): solo entonces se celebra. */
export const seCompletoAlGuardar = (antes: DatosDeSalud, despues: DatosDeSalud): boolean => !resumenDePendientes(antes).completo && resumenDePendientes(despues).completo;

export function anunciarSaludCompleta(): void {
  anuncioPendiente = true;
}

/** Entrega el anuncio una sola vez: en la siguiente visita ya no hay nada que mostrar. */
export function tomarAnuncioDeSaludCompleta(): boolean {
  const hay = anuncioPendiente;
  anuncioPendiente = false;
  return hay;
}

/** Para las pruebas y al cerrar sesión: vuelve al estado de «no se sabe nada». */
export function limpiarSaludPendiente(): void {
  pendiente = false;
  anuncioPendiente = false;
  oyentes.forEach((o) => o());
}

export const useSaludPendiente = (): boolean => useSyncExternalStore(suscribirSaludPendiente, saludPendiente);

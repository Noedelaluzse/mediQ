import type { DatosDeMedicoParaConsulta } from '../application/ElegirMedicoGuardado';

type Oyente = () => void;

let pendiente: DatosDeMedicoParaConsulta | null = null;
const oyentes = new Set<Oyente>();

/** Puente entre la pantalla "Elegir médico" y el formulario de consulta que la abrió. */
export const seleccionDeMedico = {
  elegir(datos: DatosDeMedicoParaConsulta) {
    pendiente = datos;
    oyentes.forEach((o) => o());
  },
  /** Entrega lo elegido una sola vez. */
  consumir(): DatosDeMedicoParaConsulta | null {
    const d = pendiente;
    pendiente = null;
    return d;
  },
  suscribir(oyente: Oyente): () => void {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
  },
};

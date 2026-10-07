/** ¿Hay internet? (implementado con la librería de red del teléfono). */
export interface Conectividad {
  estaConectado(): Promise<boolean>;
  /** Avisa cada vez que cambia; devuelve cómo dejar de escuchar. */
  suscribir(alCambiar: (conectado: boolean) => void): () => void;
}

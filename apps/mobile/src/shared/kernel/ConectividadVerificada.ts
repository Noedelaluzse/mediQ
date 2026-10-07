import type { Conectividad } from './Conectividad';

/**
 * La conectividad que ve la app (F052): es la del teléfono, salvo mientras la sesión está sin verificar. Si se abrió la app sin
 * internet con la sesión guardada, Firebase Auth no reconoce todavía al usuario: cualquier lectura o envío a la nube sería rechazado
 * (y una consulta pendiente podría marcarse como rechazada por error). Hasta verificarla se comporta como «sin internet», con lo que
 * la app usa sus copias locales, desactiva las ediciones y retiene la cola de envío; al verificarse avisa «ya hay conexión».
 */
export class ConectividadVerificada implements Conectividad {
  private verificada = true;
  private readonly oyentes = new Set<(conectado: boolean) => void>();

  constructor(private readonly red: Conectividad) {
    red.suscribir(() => void this.avisar());
  }

  async estaConectado(): Promise<boolean> {
    return this.verificada && (await this.red.estaConectado());
  }

  suscribir(alCambiar: (conectado: boolean) => void): () => void {
    this.oyentes.add(alCambiar);
    return () => void this.oyentes.delete(alCambiar);
  }

  ponerSinVerificar(): void {
    this.verificada = false;
    void this.avisar();
  }

  ponerVerificada(): void {
    this.verificada = true;
    void this.avisar();
  }

  private async avisar(): Promise<void> {
    const conectado = await this.estaConectado();
    for (const oyente of this.oyentes) oyente(conectado);
  }
}

import { Alert, Linking } from 'react-native';

import { enlaceDeLlamada } from '../kernel/llamada';

/**
 * Abre la marcación del teléfono con el número. Si el dispositivo no puede llamar (un simulador, una tableta sin línea) lo dice y
 * muestra el número: el botón nunca debe fallar en silencio. Ojo: en iOS `Linking.openURL` no lanza error cuando el sistema no puede
 * abrir el enlace, **responde `false`**; por eso se revisan las dos cosas.
 */
export async function llamar(telefono: string): Promise<void> {
  const enlace = enlaceDeLlamada(telefono);
  if (!enlace) {
    Alert.alert('Número no válido', `«${telefono}» no parece un número de teléfono. Corrígelo en los datos del médico.`);
    return;
  }
  const noSePudo = () => Alert.alert('No se pudo iniciar la llamada', `Este dispositivo no puede hacer llamadas. El número es ${telefono}.`);
  try {
    if ((await Linking.openURL(enlace)) === false) noSePudo();
  } catch {
    noSePudo();
  }
}

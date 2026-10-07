import { Text, View } from 'react-native';

import { useTema } from '../theme';

/**
 * Franja que explica por qué una opción de editar está desactivada: sin internet (F032). `motivo` es null con internet y entonces no
 * se dibuja nada. Va arriba de la pantalla, donde se ve sin buscar.
 */
export function AvisoSinConexion({ motivo }: { motivo: string | null }) {
  const { color, fuente, radio, espacio } = useTema();
  if (!motivo) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: color.acentoRecetaSuave, borderRadius: radio.md, padding: espacio.md }}>
      <Text style={{ color: color.acentoReceta, fontFamily: fuente.cuerpoSemi, fontSize: 13, lineHeight: 18 }}>{motivo}</Text>
    </View>
  );
}

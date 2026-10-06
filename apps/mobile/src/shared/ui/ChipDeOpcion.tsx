import { Pressable, Text } from 'react-native';

import { useTema } from '../theme';

/** Botón redondo de opción (cantidad de la dosis, unidad de la duración…). */
export function ChipDeOpcion({ texto, activo, alPulsar, etiqueta }: { texto: string; activo?: boolean; alPulsar: () => void; etiqueta?: string }) {
  const { color, fuente, radio } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: Boolean(activo) }}
      onPress={alPulsar}
      style={{
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radio.pill,
        borderWidth: 1,
        justifyContent: 'center',
        backgroundColor: activo ? color.primario : color.superficie,
        borderColor: activo ? color.primario : color.bordeCampo,
      }}>
      <Text style={{ color: activo ? color.sobrePrimario : color.texto, fontFamily: fuente.cuerpoSemi, fontSize: 14 }}>{texto}</Text>
    </Pressable>
  );
}

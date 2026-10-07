import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '../theme';

/** Casilla con su texto al lado (aceptar algo): toda la fila se puede tocar y se anuncia como casilla marcada o sin marcar. */
export function Casilla({ marcada, texto, alCambiar }: { marcada: boolean; texto: string; alCambiar: (marcada: boolean) => void }) {
  const { color, fuente } = useTema();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={texto}
      onPress={() => alCambiar(!marcada)}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 }}>
      <View style={{ width: 24, height: 24, marginTop: 1, borderRadius: 7, borderWidth: 2, borderColor: marcada ? color.primario : color.bordeCampo, backgroundColor: marcada ? color.primario : color.superficie, alignItems: 'center', justifyContent: 'center' }}>
        {marcada ? (
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12l5 5 9-10" />
          </Svg>
        ) : null}
      </View>
      <Text style={{ flex: 1, color: color.texto, fontFamily: fuente.cuerpo, fontSize: 14, lineHeight: 21 }}>{texto}</Text>
    </Pressable>
  );
}

import { Text, View } from 'react-native';

import { useTema } from '../theme';

export function Chip({ label, receta = false }: { label: string; receta?: boolean }) {
  const { color, radio, espacio } = useTema();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: receta ? color.acentoRecetaSuave : color.primarioSuave,
        borderRadius: radio.pill,
        paddingHorizontal: espacio.md,
        paddingVertical: espacio.xs,
      }}>
      <Text style={{ color: receta ? color.acentoReceta : color.primario, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </View>
  );
}

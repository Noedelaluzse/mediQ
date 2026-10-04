import { Pressable, StyleSheet, Text } from 'react-native';

import { useTema } from '../theme';

type Props = { label: string; onPress?: () => void; variante?: 'primario' | 'secundario' };

export function Button({ label, onPress, variante = 'primario' }: Props) {
  const { color, radio, espacio } = useTema();
  const primario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: 48,
          borderRadius: radio.md,
          paddingHorizontal: espacio.xl,
          backgroundColor: primario ? color.primario : color.primarioSuave,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Text style={{ color: primario ? color.sobrePrimario : color.primario, fontWeight: '600', fontSize: 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });

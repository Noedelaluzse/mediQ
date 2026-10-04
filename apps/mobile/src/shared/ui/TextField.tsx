import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTema } from '../theme';

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  const { color, radio, espacio } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      <Text style={{ color: color.textoSecundario, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholderTextColor={color.textoSecundario}
        {...props}
        style={{
          minHeight: 48,
          color: color.texto,
          backgroundColor: color.superficie,
          borderColor: color.borde,
          borderWidth: 1,
          borderRadius: radio.md,
          paddingHorizontal: espacio.lg,
          fontSize: 16,
        }}
      />
    </View>
  );
}

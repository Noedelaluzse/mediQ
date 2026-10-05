import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTema } from '../theme';

type Props = TextInputProps & { label: string; error?: string };

/** Campo de formulario del diseño: etiqueta arriba, borde marcado y, si hay error, borde rojo y mensaje. */
export function TextField({ label, error, multiline, style, ...props }: Props) {
  const { color, radio, fuente } = useTema();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={color.textoSecundario}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
        style={[
          {
            height: multiline ? 96 : 48,
            color: color.texto,
            backgroundColor: color.superficie,
            borderColor: error ? color.peligro : color.bordeCampo,
            borderWidth: error ? 2 : 1,
            borderRadius: radio.md,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 12 : 0,
            fontFamily: fuente.cuerpo,
            fontSize: 15,
          },
          style,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

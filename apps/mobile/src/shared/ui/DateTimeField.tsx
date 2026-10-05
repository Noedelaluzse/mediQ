import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';

import { fechaConAnio, horaCorta } from '../kernel/fechas';
import { useTema } from '../theme';

type Props = {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (valor: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: string;
};

/** Selector nativo de fecha u hora: iOS usa el control compacto; Android abre su diálogo al tocar. */
export function DateTimeField({ label, value, mode, onChange, maximumDate, minimumDate, error }: Props) {
  const { color, radio, fuente } = useTema();
  const texto = mode === 'date' ? fechaConAnio(value) : horaCorta(value);

  const abrirAndroid = () =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      maximumDate,
      minimumDate,
      onChange: (_evento, fecha) => fecha && onChange(fecha),
    });

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{label}</Text>
      <View
        style={{
          height: 48,
          borderRadius: radio.md,
          borderWidth: error ? 2 : 1,
          borderColor: error ? color.peligro : color.bordeCampo,
          backgroundColor: color.superficie,
          paddingHorizontal: 6,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            locale="es-MX"
            accentColor={color.primario}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_evento, fecha) => fecha && onChange(fecha)}
          />
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${texto}`} onPress={abrirAndroid} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
            <Text style={{ color: color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}>{texto}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: color.peligro, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

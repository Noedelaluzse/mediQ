import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '../theme';

type Opcion = { valor: string; etiqueta: string };

/** Campo de elección: muestra el valor actual y abre una hoja con las opciones. */
export function SelectField({
  label,
  valor,
  opciones,
  onChange,
  placeholder = '',
}: {
  label: string;
  valor: string;
  opciones: readonly Opcion[];
  onChange: (valor: string) => void;
  /** Lo que se muestra mientras no hay nada elegido. */
  placeholder?: string;
}) {
  const { color, radio, fuente } = useTema();
  const [abierto, setAbierto] = useState(false);
  const etiquetaElegida = opciones.find((o) => o.valor === valor)?.etiqueta;
  const actual = etiquetaElegida ?? placeholder;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13 }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${actual}`}
        onPress={() => setAbierto(true)}
        style={{
          height: 48,
          borderRadius: radio.md,
          borderWidth: 1,
          borderColor: color.bordeCampo,
          backgroundColor: color.superficie,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={{ color: etiquetaElegida === undefined ? color.textoSecundario : color.texto, fontFamily: fuente.cuerpo, fontSize: 15 }}>{actual}</Text>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color.textoSecundario} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable
          accessibilityLabel="Cerrar"
          onPress={() => setAbierto(false)}
          style={{ flex: 1, backgroundColor: color.velo, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: color.superficie,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 16,
              paddingBottom: 28,
              maxHeight: '70%',
            }}>
            <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 20, paddingHorizontal: 20, paddingBottom: 8 }}>
              {label}
            </Text>
            <ScrollView>
              {opciones.map((o) => {
                const elegida = o.valor === valor;
                return (
                  <Pressable
                    key={o.valor}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: elegida }}
                    onPress={() => {
                      onChange(o.valor);
                      setAbierto(false);
                    }}
                    style={{ minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: elegida ? color.primario : color.texto, fontFamily: elegida ? fuente.cuerpoBold : fuente.cuerpoMedio, fontSize: 16 }}>
                      {o.etiqueta}
                    </Text>
                    {elegida ? (
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.primario} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M5 12l5 5 9-10" />
                      </Svg>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

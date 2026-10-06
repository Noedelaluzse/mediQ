import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useTema } from '@/shared/theme';

import { FRECUENCIAS_CADA, FRECUENCIAS_OTRAS, FRECUENCIAS_VECES, frecuenciaCada, frecuenciaVeces, OTRA } from '../domain/CatalogoDeReceta';

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

/** Botón cuadrado de − o + de la duración. */
export function BotonDeCantidad({ signo, etiqueta, alPulsar }: { signo: '−' | '+'; etiqueta: string; alPulsar: () => void }) {
  const { color, fuente, radio } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alPulsar}
      style={{ width: 44, height: 44, borderRadius: radio.md, borderWidth: 1, borderColor: color.bordeCampo, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: color.texto, fontFamily: fuente.cuerpoBold, fontSize: 22 }}>{signo}</Text>
    </Pressable>
  );
}

/** Hoja de frecuencia: «Cada N horas» y «veces al día» como botones, el resto en lista, y «Otra…». */
export function HojaDeFrecuencia({ visible, valor, alElegir, alCerrar }: { visible: boolean; valor: string; alElegir: (frecuencia: string) => void; alCerrar: () => void }) {
  const { color, fuente } = useTema();
  const grupo = { color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 } as const;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCerrar}>
      <Pressable accessibilityLabel="Cerrar" onPress={alCerrar} style={{ flex: 1, backgroundColor: color.velo, justifyContent: 'flex-end' }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: color.superficie, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 28, maxHeight: '80%' }}>
          <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 20, paddingHorizontal: 20, paddingBottom: 8 }}>Frecuencia</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={grupo}>Cada…</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FRECUENCIAS_CADA.map((h) => (
                <ChipDeOpcion key={h} texto={`${h} h`} etiqueta={frecuenciaCada(h)} activo={valor === frecuenciaCada(h)} alPulsar={() => alElegir(frecuenciaCada(h))} />
              ))}
            </View>
            <Text style={{ ...grupo, marginTop: 6 }}>Veces al día</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FRECUENCIAS_VECES.map((n) => (
                <ChipDeOpcion key={n} texto={`${n}`} etiqueta={frecuenciaVeces(n)} activo={valor === frecuenciaVeces(n)} alPulsar={() => alElegir(frecuenciaVeces(n))} />
              ))}
            </View>
            <Text style={{ ...grupo, marginTop: 6 }}>Otros</Text>
            {[...FRECUENCIAS_OTRAS, OTRA].map((t) => (
              <Pressable key={t} accessibilityRole="radio" accessibilityState={{ selected: valor === t }} onPress={() => alElegir(t)} style={{ minHeight: 48, justifyContent: 'center' }}>
                <Text style={{ color: valor === t ? color.primario : color.texto, fontFamily: valor === t ? fuente.cuerpoBold : fuente.cuerpoMedio, fontSize: 16 }}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

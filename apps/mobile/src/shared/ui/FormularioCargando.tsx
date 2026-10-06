import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '../theme';
import { Esqueleto, GrupoDeEsqueletos } from './Esqueleto';

/**
 * Pantalla de un formulario de edición mientras llegan los datos guardados. Así no se ve un formulario vacío que luego se llena
 * (ni se le puede escribir encima a algo que todavía no llegó).
 */
export function FormularioCargando({ titulo, campos = 5, etiqueta = 'Cargando' }: { titulo: string; campos?: number; etiqueta?: string }) {
  const { color, fuente, radio } = useTema();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 20 }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Cancelar</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 }}>
          {titulo}
        </Text>
        <GrupoDeEsqueletos etiqueta={etiqueta} style={{ gap: 18 }}>
          {Array.from({ length: campos }, (_, i) => (
            <View key={i} style={{ gap: 6 }}>
              <Esqueleto ancho={i % 2 === 0 ? 120 : 160} alto={12} />
              <Esqueleto alto={48} radio={radio.md} />
            </View>
          ))}
        </GrupoDeEsqueletos>
      </ScrollView>
    </SafeAreaView>
  );
}

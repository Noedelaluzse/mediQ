import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useSesion } from '@/modules/auth/presentation/SesionProvider';
import { useTema } from '@/shared/theme';

// El diario real (lista por mes) llega con F013 (RF-12); por ahora solo está el acceso a "Nueva consulta".
export default function DiarioScreen() {
  const { color, fuente, espacio } = useTema();
  const { sesion } = useSesion();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ padding: espacio.xl, gap: espacio.sm }}>
        <Text style={{ color: color.texto, fontFamily: fuente.titulo, fontSize: 32, lineHeight: 36 }}>Mi diario</Text>
        <Text style={{ color: color.textoSecundario, fontFamily: fuente.cuerpo, fontSize: 16 }}>
          Hola, {sesion?.usuario.nombre}. Aquí aparecerán tus consultas.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/consulta-nueva')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 110,
          height: 52,
          paddingLeft: 16,
          paddingRight: 20,
          borderRadius: 26,
          backgroundColor: color.texto,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.sobrePrimario} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
        <Text style={{ color: color.sobrePrimario, fontFamily: fuente.cuerpoSemi, fontSize: 15 }}>Nueva consulta</Text>
      </Pressable>
    </SafeAreaView>
  );
}

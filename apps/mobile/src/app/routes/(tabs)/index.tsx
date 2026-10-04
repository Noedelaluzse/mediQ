import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/modules/auth/presentation/SesionProvider';
import { useTema } from '@/shared/theme';

// Marcador de posición: el diario real llega con F013 (RF-12).
export default function DiarioScreen() {
  const { color, espacio } = useTema();
  const { sesion } = useSesion();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }}>
      <View style={{ padding: espacio.xl, gap: espacio.sm }}>
        <Text style={{ color: color.texto, fontSize: 32, fontWeight: '700' }}>Mi diario</Text>
        <Text style={{ color: color.textoSecundario, fontSize: 16 }}>
          Hola, {sesion?.usuario.nombre}. Aquí aparecerán tus consultas.
        </Text>
      </View>
    </SafeAreaView>
  );
}
